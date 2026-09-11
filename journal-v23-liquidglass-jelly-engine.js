/* Journal v23: stronger LiquidGlass-native jelly deformation without extra shader passes. */
(() => {
  const proto = globalThis.WebGLRenderingContext?.prototype;
  if (!proto || proto.__hjLiquidV23Patch) return;
  Object.defineProperty(proto, '__hjLiquidV23Patch', { value: true, configurable: false });

  const originalShaderSource = proto.shaderSource;
  const originalDrawArrays = proto.drawArrays;
  const uniformsByProgram = new WeakMap();

  function patchGlassFragment(source) {
    if (typeof source !== 'string') return source;
    if (!source.includes('uniform float u_bevelMode;') ||
        !source.includes('float rrSDF(vec2 p, vec2 b, float r)') ||
        !source.includes('float bevelHeight(float d, float zR)') ||
        !source.includes('vec2 hGrad = vec2(hR - hL, hU - hD)')) return source;
    if (source.includes('u_hjJellyEnabled')) return source;

    let out = source.replace(
      'uniform float u_bevelMode;',
      `uniform float u_bevelMode;\nuniform vec2 u_hjPressUV;\nuniform float u_hjPressDepth;\nuniform float u_hjPressRadius;\nuniform vec2 u_hjPressAxis;\nuniform vec2 u_hjShapeScale;\nuniform float u_hjJellyEnabled;\nuniform vec2 u_hjJellyBaseSize;\nuniform float u_hjJellyAngle;\nuniform vec2 u_hjJellyStretch;\nuniform float u_hjJellyStretchAngle;\nuniform vec2 u_hjJellyShear;\nuniform vec4 u_hjJellyWave;\nuniform vec4 u_hjJellyContact0;\nuniform vec4 u_hjJellyContact1;\nuniform vec4 u_hjJellyContact2;\nuniform vec4 u_hjJellyContact3;\nuniform vec2 u_hjJellyContactAxis0;\nuniform vec2 u_hjJellyContactAxis1;\nuniform vec2 u_hjJellyContactAxis2;\nuniform vec2 u_hjJellyContactAxis3;`
    );

    const marker = `float hash(vec2 p) {\n\treturn fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);\n}\n`;
    const helpers = `${marker}\n// HJ v23 — stronger material response, same single LiquidGlass shader pass.\nvec2 hjRotate(vec2 p, float a) {\n\tfloat c = cos(a);\n\tfloat s = sin(a);\n\treturn vec2(c * p.x - s * p.y, s * p.x + c * p.y);\n}\n\nvec2 hjPressPx(vec2 size_) {\n\treturn (u_hjPressUV - vec2(0.5)) * size_;\n}\n\nvec2 hjJellySize() {\n\treturn u_hjJellyEnabled >= 0.5 ? max(u_hjJellyBaseSize, vec2(32.0)) : u_size;\n}\n\nvec2 hjShapeHalf(vec2 half_) {\n\tvec2 baseHalf = u_hjJellyEnabled >= 0.5 ? hjJellySize() * 0.5 : half_;\n\treturn baseHalf * clamp(u_hjShapeScale, vec2(0.82), vec2(1.18));\n}\n\nfloat hjShapeRadius(float r, vec2 half_) {\n\tvec2 s = clamp(u_hjShapeScale, vec2(0.82), vec2(1.18));\n\tvec2 shapedHalf = hjShapeHalf(half_);\n\tfloat radialScale = sqrt(max(0.25, s.x * s.y));\n\treturn min(r * radialScale, min(shapedHalf.x, shapedHalf.y));\n}\n\nvec2 hjJellyMap(vec2 p) {\n\tif (u_hjJellyEnabled < 0.5) return p;\n\tvec2 q = hjRotate(p, -u_hjJellyAngle);\n\tvec2 jellySize = hjJellySize();\n\tfloat hx = max(1.0, jellySize.x * 0.5);\n\tfloat hy = max(1.0, jellySize.y * 0.5);\n\tfloat nx = clamp(q.x / hx, -1.5, 1.5);\n\tfloat ny = clamp(q.y / hy, -1.5, 1.5);\n\tq.x -= u_hjJellyShear.x * ny * min(42.0, hx * 0.28);\n\tq.y -= u_hjJellyShear.y * nx * min(36.0, hy * 0.31);\n\tq.x -= sin(ny * 3.05 + u_hjJellyWave.z) * u_hjJellyWave.x;\n\tq.y -= sin(nx * 2.85 + u_hjJellyWave.w) * u_hjJellyWave.y;\n\tvec2 z = hjRotate(q, -u_hjJellyStretchAngle);\n\tz /= clamp(u_hjJellyStretch, vec2(0.52), vec2(1.55));\n\treturn hjRotate(z, u_hjJellyStretchAngle);\n}\n\nfloat hjPressProfile(vec2 p, vec2 half_) {\n\tvec2 press = hjPressPx(u_size);\n\tvec2 shapedHalf = hjShapeHalf(half_);\n\tfloat radiusPx = max(18.0, min(shapedHalf.x, shapedHalf.y) * max(u_hjPressRadius, 0.08));\n\tvec2 axis = max(u_hjPressAxis, vec2(0.35));\n\tvec2 qv = (p - press) / axis;\n\tfloat q = length(qv) / radiusPx;\n\tfloat gaussian = exp(-3.35 * q * q);\n\treturn gaussian * (1.0 - smoothstep(0.86, 1.24, q));\n}\n\nfloat hjContactProfile(vec2 p, vec4 c, vec2 axis, vec2 half_) {\n\tif (c.z <= 0.001) return 0.0;\n\tvec2 cp = (c.xy - vec2(0.5)) * hjJellySize();\n\tfloat radiusPx = max(12.0, min(half_.x, half_.y) * max(c.w, 0.06));\n\tvec2 qv = (p - cp) / max(axis, vec2(0.24));\n\tfloat q = length(qv) / radiusPx;\n\treturn c.z * exp(-2.45 * q * q) * (1.0 - smoothstep(0.82, 1.34, q));\n}\n\nfloat hjContactEdgeWeight(vec4 c, vec2 half_, float r, float zR) {\n\tif (c.z <= 0.001) return 0.0;\n\tvec2 cp = (c.xy - vec2(0.5)) * hjJellySize();\n\tfloat inside = max(0.0, -rrSDF(cp, half_, r));\n\treturn 1.0 - smoothstep(0.0, max(18.0, zR * 1.40), inside);\n}\n\nfloat hjJellyBoundaryIndent(vec2 p, vec2 half_, float r, float zR) {\n\tif (u_hjJellyEnabled < 0.5) return 0.0;\n\tfloat a = hjContactProfile(p, u_hjJellyContact0, u_hjJellyContactAxis0, half_) * hjContactEdgeWeight(u_hjJellyContact0, half_, r, zR);\n\tfloat b = hjContactProfile(p, u_hjJellyContact1, u_hjJellyContactAxis1, half_) * hjContactEdgeWeight(u_hjJellyContact1, half_, r, zR);\n\tfloat c = hjContactProfile(p, u_hjJellyContact2, u_hjJellyContactAxis2, half_) * hjContactEdgeWeight(u_hjJellyContact2, half_, r, zR);\n\tfloat d = hjContactProfile(p, u_hjJellyContact3, u_hjJellyContactAxis3, half_) * hjContactEdgeWeight(u_hjJellyContact3, half_, r, zR);\n\treturn max(max(a,b), max(c,d)) * min(34.0, max(8.0, zR * 0.48));\n}\n\nfloat hjJellySurfaceDent(vec2 p, vec2 half_) {\n\tif (u_hjJellyEnabled < 0.5) return 0.0;\n\tfloat a = hjContactProfile(p, u_hjJellyContact0, u_hjJellyContactAxis0, half_);\n\tfloat b = hjContactProfile(p, u_hjJellyContact1, u_hjJellyContactAxis1, half_);\n\tfloat c = hjContactProfile(p, u_hjJellyContact2, u_hjJellyContactAxis2, half_);\n\tfloat d = hjContactProfile(p, u_hjJellyContact3, u_hjJellyContactAxis3, half_);\n\treturn max(max(a,b), max(c,d));\n}\n\nfloat hjSDF(vec2 p, vec2 half_, float r, float zR) {\n\tvec2 shapedHalf = hjShapeHalf(half_);\n\tfloat shapedR = hjShapeRadius(r, half_);\n\tvec2 materialP = hjJellyMap(p);\n\tfloat base = rrSDF(materialP, shapedHalf, shapedR);\n\tif (u_hjJellyEnabled >= 0.5) {\n\t\treturn base + hjJellyBoundaryIndent(materialP, shapedHalf, shapedR, zR);\n\t}\n\tif (u_hjPressDepth <= 0.001) return base;\n\tvec2 press = hjPressPx(u_size);\n\tfloat pressInside = max(0.0, -rrSDF(press, shapedHalf, shapedR));\n\tfloat edgeWeight = 1.0 - smoothstep(0.0, max(12.0, zR * 1.15), pressInside);\n\tfloat edgeIndent = min(18.0, max(5.0, zR * 0.26)) * edgeWeight * u_hjPressDepth;\n\treturn base + hjPressProfile(materialP, half_) * edgeIndent;\n}\n\nfloat hjSurfaceHeight(vec2 p, vec2 half_, float r, float zR) {\n\tvec2 shapedHalf = hjShapeHalf(half_);\n\tfloat shapedR = hjShapeRadius(r, half_);\n\tvec2 materialP = hjJellyMap(p);\n\tfloat insideP = -rrSDF(materialP, shapedHalf, shapedR);\n\tif (insideP <= 0.0) return 0.0;\n\tfloat boundaryIndent = u_hjJellyEnabled >= 0.5 ? hjJellyBoundaryIndent(materialP, shapedHalf, shapedR, zR) : 0.0;\n\tinsideP = max(0.0, insideP - boundaryIndent);\n\tfloat baseH = bevelHeight(insideP, zR);\n\tif (u_hjJellyEnabled >= 0.5) {\n\t\tfloat dent = hjJellySurfaceDent(materialP, shapedHalf);\n\t\treturn max(0.0, baseH - zR * 0.56 * dent);\n\t}\n\tif (u_hjPressDepth <= 0.001) return baseH;\n\tvec2 press = hjPressPx(u_size);\n\tfloat pressInside = max(0.0, -rrSDF(press, shapedHalf, shapedR));\n\tfloat edgeBoost = 1.0 - smoothstep(0.0, max(16.0, zR * 1.35), pressInside);\n\tfloat dentAmp = zR * (0.30 + 0.12 * edgeBoost) * u_hjPressDepth;\n\treturn max(0.0, baseH - dentAmp * hjPressProfile(materialP, half_));\n}\n`;
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
    const jellyEnabled = gl.getUniformLocation(program, 'u_hjJellyEnabled');
    if (!depth || !shape || !jellyEnabled) {
      uniformsByProgram.set(program, null);
      return null;
    }
    cached = {
      depth, shape, jellyEnabled,
      uv: gl.getUniformLocation(program, 'u_hjPressUV'),
      radius: gl.getUniformLocation(program, 'u_hjPressRadius'),
      axis: gl.getUniformLocation(program, 'u_hjPressAxis'),
      jellyBaseSize: gl.getUniformLocation(program, 'u_hjJellyBaseSize'),
      jellyAngle: gl.getUniformLocation(program, 'u_hjJellyAngle'),
      jellyStretch: gl.getUniformLocation(program, 'u_hjJellyStretch'),
      jellyStretchAngle: gl.getUniformLocation(program, 'u_hjJellyStretchAngle'),
      jellyShear: gl.getUniformLocation(program, 'u_hjJellyShear'),
      jellyWave: gl.getUniformLocation(program, 'u_hjJellyWave'),
      contacts: [0,1,2,3].map(i => gl.getUniformLocation(program, `u_hjJellyContact${i}`)),
      contactAxes: [0,1,2,3].map(i => gl.getUniformLocation(program, `u_hjJellyContactAxis${i}`))
    };
    uniformsByProgram.set(program, cached);
    return cached;
  }

  const finite = (v, fallback=0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));

  proto.drawArrays = function(...args) {
    try {
      const program = this.getParameter(this.CURRENT_PROGRAM);
      const loc = program && getUniforms(this, program);
      if (loc) {
        const neutral = !!globalThis.__HJLiquidGlassNeutralContexts?.has?.(this);
        const p = globalThis.__HJGlassDentState || {};
        const j = globalThis.__HJRealJellyState || {};
        const jellyOn = !neutral && !!j.enabled;

        this.uniform1f(loc.depth, neutral || jellyOn ? 0 : clamp(finite(p.depth),0,1.15));
        this.uniform2f(loc.shape,
          neutral || jellyOn ? 1 : clamp(finite(p.shapeX,1),.82,1.18),
          neutral || jellyOn ? 1 : clamp(finite(p.shapeY,1),.82,1.18)
        );
        if (loc.uv) this.uniform2f(loc.uv, clamp(finite(p.u,.5),0,1), clamp(finite(p.v,.5),0,1));
        if (loc.radius) this.uniform1f(loc.radius, clamp(finite(p.radius,.42),.08,.92));
        if (loc.axis) this.uniform2f(loc.axis, clamp(finite(p.axisX,1),.35,1.35), clamp(finite(p.axisY,1),.35,1.35));

        this.uniform1f(loc.jellyEnabled, jellyOn ? 1 : 0);
        if (loc.jellyBaseSize) {
          const dpr = Math.max(1, finite(globalThis.devicePixelRatio,1));
          this.uniform2f(loc.jellyBaseSize,
            jellyOn ? Math.max(32, finite(j.baseW,280) * dpr) : 32,
            jellyOn ? Math.max(32, finite(j.baseH,176) * dpr) : 32
          );
        }
        if (loc.jellyAngle) this.uniform1f(loc.jellyAngle, jellyOn ? clamp(finite(j.angle),-.42,.42) : 0);
        if (loc.jellyStretch) this.uniform2f(loc.jellyStretch,
          jellyOn ? clamp(finite(j.stretchX,1),.52,1.55) : 1,
          jellyOn ? clamp(finite(j.stretchY,1),.52,1.55) : 1
        );
        if (loc.jellyStretchAngle) this.uniform1f(loc.jellyStretchAngle, jellyOn ? finite(j.stretchAngle) : 0);
        if (loc.jellyShear) this.uniform2f(loc.jellyShear,
          jellyOn ? clamp(finite(j.shearX),-.48,.48) : 0,
          jellyOn ? clamp(finite(j.shearY),-.48,.48) : 0
        );
        if (loc.jellyWave) this.uniform4f(loc.jellyWave,
          jellyOn ? clamp(finite(j.waveX),0,18) : 0,
          jellyOn ? clamp(finite(j.waveY),0,18) : 0,
          jellyOn ? finite(j.phaseX) : 0,
          jellyOn ? finite(j.phaseY) : 0
        );

        const contacts = Array.isArray(j.contacts) ? j.contacts : [];
        for (let i=0;i<4;i++) {
          const c = jellyOn && contacts[i] ? contacts[i] : {};
          if (loc.contacts[i]) this.uniform4f(loc.contacts[i],
            clamp(finite(c.u,.5),0,1), clamp(finite(c.v,.5),0,1),
            jellyOn ? clamp(finite(c.depth),0,1.55) : 0,
            clamp(finite(c.radius,.28),.06,.86)
          );
          if (loc.contactAxes[i]) this.uniform2f(loc.contactAxes[i],
            clamp(finite(c.axisX,1),.20,2.3), clamp(finite(c.axisY,1),.20,2.3)
          );
        }
      }
    } catch (error) {
      console.warn('HJ LiquidGlass v23 uniform update failed:', error);
    }
    return originalDrawArrays.apply(this, args);
  };
})();
