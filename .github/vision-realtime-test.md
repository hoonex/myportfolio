# Vision realtime stream proof

The Vision CI must prove repeated FaceLandmarker inference over a moving real-human MediaStream, not only single-image inference.

Required production path: decoded video frames -> requestVideoFrameCallback (with RAF fallback) -> repeated FaceLandmarker -> production face-mesh renderer.
