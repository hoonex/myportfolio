/* Journal v17: real LiquidGlass shader deformation with local dent + shape growth/squash. */
(() => {
  const proto = globalThis.WebGLRenderingContext?.prototype;
  if (!proto || proto.__hjLiquidV17Patch) return;
  Object.defineProperty(proto, '__hjLiquidV17Patch', { value: true, configurable: false });

  const originalShaderSource = proto.shaderSource;
  const originalDrawArrays = proto.drawArrays;
  const uniformsByProgram = new WeakMap();

  function patchGlassFragment(source) {
    if (typeof source !== 'string') return source;
    if (!source.includes('uniform float u_bevelMode;') ||
        !source.includes('float rrSDF(vec2 p, vec2 b, float r)') ||
        !source.includes('float bevelHeight(float d, float zR)') ||
        !source.includes('vec2 hGrad = vec2(hR - hL, hU - hD)')) return source;
    if (source.includes('u_hjShapeScale')) return source;

    let out = source.replace(
      'uniform float u_bevelMode;',
      `uniform float u_bevelMode;\nuniform vec2 u_hjPressUV;\nuniform float u_hjPressDepth;\nuniform float u_hjPressRadius;\nuniform vec2 u_hjPressAxis;\nuniform vec2 u_hjShapeScale;`
    );

    const marker = `float hash(vec2 p) {\n\treturn fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);\n}\n`;
    const helpers = `${marker}\n// HJ v17: deformation stays inside LiquidGlass' own SDF/height field.\n// The DOM element never scales; the shader expands/squashes inside the padded canvas.\nvec2 hjPressPx(vec2 size_) {\n\treturn (u_hjPressUV - vec2(0.5)) * size_;\n}\n\nvec2 hjShapeHalf(vec2 half_) {\n\treturn half_ * clamp(u_hjShapeScale, vec2(0.82), vec2(1.18));\n}\n\nfloat hjShapeRadius(float r, vec2 half_) {\n\tvec2 s = clamp(u_hjShapeScale, vec2(0.82), vec2(1.18));\n\tvec2 shapedHalf = hjShapeHalf(half_);\n\tfloat radialScale = sqrt(max(0.25, s.x * s.y));\n\treturn min(r * radialScale, min(shapedHalf.x, shapedHalf.y));\n}\n\nfloat hjPressProfile(vec2 p, vec2 half_) {\n\tvec2 press = hjPressPx(u_size);\n\tvec2 shapedHalf = hjShapeHalf(half_);\n\tfloat radiusPx = max(18.0, min(shapedHalf.x, shapedHalf.y) * max(u_hjPressRadius, 0.08));\n\tvec2 axis = max(u_hjPressAxis, vec2(0.35));\n\tvec2 qv = (p - press) / axis;\n\tfloat q = length(qv) / radiusPx;\n\tfloat gaussian = exp(-3.35 * q * q);\n\treturn gaussian * (1.0 - smoothstep(0.86, 1.24, q));\n}\n\nfloat hjSDF(vec2 p, vec2 half_, float r, float zR) {\n\tvec2 shapedHalf = hjShapeHalf(half_);\n\tfloat shapedR = hjShapeRadius(r, half_);\n\tfloat base = rrSDF(p, shapedHalf, shapedR);\n\tif (u_hjPressDepth <= 0.001) return base;\n\tvec2 press = hjPressPx(u_size);\n\tfloat pressInside = max(0.0, -rrSDF(press, shapedHalf, shapedR));\n\tfloat edgeWeight = 1.0 - smoothstep(0.0, max(12.0, zR * 1.15), pressInside);\n\tfloat edgeIndent = min(18.0, max(5.0, zR * 0.26)) * edgeWeight * u_hjPressDepth;\n\treturn base + hjPressProfile(p, half_) * edgeIndent;\n}\n\nfloat hjSurfaceHeight(vec2 p, vec2 half_, float r, float zR) {\n\tfloat insideP = -hjSDF(p, half_, r, zR);\n\tif (insideP <= 0.0) return 0.0;\n\tfloat baseH = bevelHeight(insideP, zR);\n\tif (u_hjPressDepth <= 0.001) return baseH;\n\tvec2 press = hjPressPx(u_size);\n\tvec2 shapedHalf = hjShapeHalf(half_);\n\tfloat shapedR = hjShapeRadius(r, half_);\n\tfloat pressInside = max(0.0, -rrSDF(press, shapedHalf, shapedR));\n\tfloat edgeBoost = 1.0 - smoothstep(0.0, max(16.0, zR * 1.35), pressInside);\n\tfloat dentAmp = zR * (0.30 + 0.12 * edgeBoost) * u_hjPressDepth;\n\treturn max(0.0, baseH - dentAmp * hjPressProfile(p, half_));\n}\n`;
    if (!out.includes(marker)) return source;
    out = out.replace(marker, helpers);

    out = out.replace(
      'float sdf = rrSDF(v_localPx, half_, r);',
      'float sdf = hjSDF(v_localPx, half_, r, u_zRadius);'
    );
    out = out.replace(
      'float sdfShadow = rrSDF(v_localPx - vec2(0.0, u_shadowOffY), half_, r);',
      'float sdfShadow = hjSDF(v_localPx - vec2(0.0, u_shadowOffY), half_, r, u_zRadius);'
    );
    out = out.replace(
      `float dC = inside;\n\tfloat dR = -rrSDF(v_localPx + vec2(e, 0.0), half_, r);\n\tfloat dL = -rrSDF(v_localPx - vec2(e, 0.0), half_, r);\n\tfloat dU = -rrSDF(v_localPx + vec2(0.0, e), half_, r);\n\tfloat dD = -rrSDF(v_localPx - vec2(0.0, e), half_, r);\n\tfloat hC = bevelHeight(dC, zR);\n\tfloat hR = bevelHeight(dR, zR);\n\tfloat hL = bevelHeight(dL, zR);\n\tfloat hU = bevelHeight(dU, zR);\n\tfloat hD = bevelHeight(dD, zR);`,
      `float dC = inside;\n\tfloat hC = hjSurfaceHeight(v_localPx, half_, r, zR);\n\tfloat hR = hjSurfaceHeight(v_localPx + vec2(e, 0.0), half_, r, zR);\n\tfloat hL = hjSurfaceHeight(v_localPx - vec2(e, 0.0), half_, r, zR);\n\tfloat hU = hjSurfaceHeight(v_localPx + vec2(0.0, e), half_, r, zR);\n\tfloat hD = hjSurfaceHeight(v_localPx - vec2(0.0, e), half_, r, zR);`
    );
    return out;
  }

  proto.shaderSource = function(shader, source) {
    return originalShaderSource.call(this, shader, patchGlassFragment(source));
  };

  function getUniforms(gl, program) {
    let cached = uniformsByProgram.get(program);
    if (cached !== undefined) return cached;
    const depth = gl.getUniformLocation(program, 'u_hjPressDepth');
    const shape = gl.getUniformLocation(program, 'u_hjShapeScale');
    if (!depth || !shape) {
      uniformsByProgram.set(program, null);
      return null;
    }
    cached = {
      depth,
      shape,
      uv: gl.getUniformLocation(program, 'u_hjPressUV'),
      radius: gl.getUniformLocation(program, 'u_hjPressRadius'),
      axis: gl.getUniformLocation(program, 'u_hjPressAxis')
    };
    uniformsByProgram.set(program, cached);
    return cached;
  }

  proto.drawArrays = function(...args) {
    try {
      const program = this.getParameter(this.CURRENT_PROGRAM);
      const loc = program && getUniforms(this, program);
      if (loc) {
        const s = globalThis.__HJGlassDentState || {};
        const depth = Math.max(0, Math.min(1.15, Number(s.depth) || 0));
        const u = Math.max(0, Math.min(1, Number(s.u) || 0.5));
        const v = Math.max(0, Math.min(1, Number(s.v) || 0.5));
        const radius = Math.max(0.08, Math.min(0.92, Number(s.radius) || 0.42));
        const ax = Math.max(0.35, Math.min(1.35, Number(s.axisX) || 1));
        const ay = Math.max(0.35, Math.min(1.35, Number(s.axisY) || 1));
        const sx = Math.max(0.82, Math.min(1.18, Number(s.shapeX) || 1));
        const sy = Math.max(0.82, Math.min(1.18, Number(s.shapeY) || 1));
        this.uniform1f(loc.depth, depth);
        this.uniform2f(loc.shape, sx, sy);
        if (loc.uv) this.uniform2f(loc.uv, u, v);
        if (loc.radius) this.uniform1f(loc.radius, radius);
        if (loc.axis) this.uniform2f(loc.axis, ax, ay);
      }
    } catch (error) {
      console.warn('HJ LiquidGlass v17 uniform update failed:', error);
    }
    return originalDrawArrays.apply(this, args);
  };
})();
