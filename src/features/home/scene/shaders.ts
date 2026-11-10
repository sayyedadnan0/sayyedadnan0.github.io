// GLSL programs for the home scene. Keep shader tuning separate from lifecycle and input handling.

export const fboMaterialVertexShader = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `

export const fboMaterialFragmentShader = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uPrevTrail;
        uniform vec2 uMouse;
        uniform vec2 uPrevMouse;
        uniform float uSpeed;
        uniform float uDecay;
        uniform float uAspect;
        uniform float uDeltaTime;
        uniform float uTime;

        float distToSegment(vec2 p, vec2 a, vec2 b, float aspect) {
          vec2 pa = (p - a) * vec2(aspect, 1.0);
          vec2 ba = (b - a) * vec2(aspect, 1.0);
          float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.000001), 0.0, 1.0);
          return length(pa - ba * h);
        }

        void main() {
          vec2 texel = 1.0 / vec2(512.0);
          vec4 prev = texture2D(uPrevTrail, vUv);

          // Directional backward advection with gentle turbulent eddy current
          vec2 vel = prev.ba;
          vec2 eddy = vec2(sin(vUv.y * 28.0 + uTime * 0.75),
                           cos(vUv.x * 24.0 - uTime * 0.65));
          vec2 advectUv = vUv - (vel * 0.28 + eddy * prev.r * 0.022) * uDeltaTime;
          vec4 advected = texture2D(uPrevTrail, clamp(advectUv, texel, 1.0 - texel));

          // Lateral diffusion (sand dust billowing and spreading gently)
          vec4 n1 = texture2D(uPrevTrail, clamp(vUv + vec2(texel.x, 0.0), texel, 1.0 - texel));
          vec4 n2 = texture2D(uPrevTrail, clamp(vUv - vec2(texel.x, 0.0), texel, 1.0 - texel));
          vec4 n3 = texture2D(uPrevTrail, clamp(vUv + vec2(0.0, texel.y), texel, 1.0 - texel));
          vec4 n4 = texture2D(uPrevTrail, clamp(vUv - vec2(0.0, texel.y), texel, 1.0 - texel));
          vec4 diffused = mix(advected, (n1 + n2 + n3 + n4) * 0.25, 1.0 - exp(-7.5 * uDeltaTime));

          diffused.r *= uDecay;
          diffused.g *= exp(-1.2 * uDeltaTime);
          diffused.ba *= exp(-1.8 * uDeltaTime);

          float splat = 0.0;
          vec2 injectedVel = vec2(0.0);

          if (uSpeed > 0.0015 && uMouse.x >= 0.0 && uPrevMouse.x >= 0.0) {
            float d = distToSegment(vUv, uPrevMouse, uMouse, uAspect);
            float radius = 0.038 + clamp(uSpeed * 0.035, 0.0, 0.048);

            float core = exp(-d * d / (radius * radius * 0.45));
            splat = core * clamp(uSpeed * 3.8, 0.0, 1.0) * min(uDeltaTime * 18.0, 0.65);

            vec2 moveDir = uMouse - uPrevMouse;
            injectedVel = normalize(moveDir + vec2(0.0001)) * clamp(uSpeed * 0.50, 0.0, 1.0);
          }

          float newDensity = clamp(diffused.r + splat, 0.0, 1.0);
          float newPhase = clamp(diffused.g + splat * 1.2, 0.0, 1.0);
          vec2 newVel = mix(diffused.ba, injectedVel, clamp(splat * 2.2, 0.0, 1.0));

          gl_FragColor = vec4(newDensity, newPhase, newVel.x, newVel.y);
        }
      `

export const canopyMaterialVertexShader = `
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `

export const canopyMaterialFragmentShader = `
        precision highp float;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        uniform float uProgress;

        void main() {
          // Near-black obsidian base — the crown reads as a silhouette, not a solid object
          vec3 baseBlack = vec3(0.00015, 0.00012, 0.0001);

          // Only the very sharpest exterior bevel edges catch grazing light
          // Faces that are nearly horizontal (top/bottom surfaces) get nearly zero light
          float isVerticalFace = 1.0 - smoothstep(0.30, 0.72, abs(vWorldNormal.y));

          // Key raking light from upper-left — matches the hero halo direction
          vec3 sunDir = normalize(vec3(-0.52, 0.72, 0.46));
          float nDotL = max(dot(vWorldNormal, sunDir), 0.0);

          // Ultra-narrow razor-edge glint: only the sharpest exterior bevel catches light
          float razorGlint = pow(nDotL, 14.0) * isVerticalFace * 0.03;

          // Curvature catch-light on facet corners (the architectural steps)
          vec3 dNx = dFdx(vWorldNormal);
          vec3 dNy = dFdy(vWorldNormal);
          float curvature = length(dNx) + length(dNy);
          float cornerSpark = smoothstep(0.08, 0.38, curvature) * isVerticalFace * pow(nDotL, 2.5) * 0.008;

          // Restrict highlights to outward-facing surfaces only
          vec3 radial = normalize(vec3(vWorldPos.x, 0.0, vWorldPos.z));
          float exteriorEdge = smoothstep(-0.1, 0.40, dot(radial, vWorldNormal));

          vec3 highlightCol = vec3(0.95, 0.93, 0.88) * (razorGlint + cornerSpark) * exteriorEdge;

          gl_FragColor = vec4(baseBlack + highlightCol, 0.0);
        }
      `

export const floorMaterialVertexShader = `
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `

export const floorMaterialFragmentShader = `
        precision highp float;
        void main() {
          gl_FragColor = vec4(vec3(0.0001), 0.0);
        }
      `

export const haloMaterialVertexShader = `
        varying vec2 vPosition;
        varying vec3 vWorldPos;
        void main() {
          vPosition = position.xy;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `

export const haloMaterialFragmentShader = `
        precision highp float;
        varying vec2 vPosition;
        varying vec3 vWorldPos;
        uniform vec3 uHeroFootprint;
        uniform sampler2D uRoofProfile;
        uniform float uOutlineRotation;
        uniform float uProgress;

        void main() {
          vec2 p = vPosition;
          float angle = atan(p.y, p.x) - uOutlineRotation;
          vec2 packedRadius = texture2D(uRoofProfile, vec2(fract(angle / 6.2831853 + 0.5), 0.5)).rg;
          float steppedRadius = uHeroFootprint.z * dot(packedRadius, vec2(65280.0, 255.0)) * (1.15 / 65535.0);

          float r = length(p);
          // Confine halo strictly outside the stepped architectural silhouette
          if (r <= steppedRadius) discard;

          vec2 dir = normalize(p + vec2(0.0001));

          // Primary concentrated beam: top-left (matching studio mirage reference).
          // The corona reads as directional raking light from a single source, not omnidirectional.
          float flareTopLeft = pow(max(dot(dir, vec2(-0.38, 0.92)), 0.0), 4.2) * 2.6;
          float flareTop = pow(max(dot(dir, vec2(0.08, 0.998)), 0.0), 9.0) * 0.9;
          float flareRight = pow(max(dot(dir, vec2(0.82, 0.57)), 0.0), 10.0) * 0.5;
          float combinedRim = flareTopLeft + flareTop + flareRight;

          float distFromEdge = r - steppedRadius;
          // Tight bright corona right at the silhouette edge
          float rimFalloff = exp(-distFromEdge * 5.5) * combinedRim;
          // Wider, much dimmer atmospheric glow (keeps deep black space feeling)
          float broadGlow = exp(-distFromEdge * 1.4) * 0.08 * (flareTopLeft * 0.55 + 0.45);

          vec3 rimColor = vec3(0.97, 0.95, 0.91);
          vec3 col = rimColor * (rimFalloff * 0.28 + broadGlow * 0.07);

          // Smoothly dissipates as camera enters gallery
          col *= (1.0 - smoothstep(0.30, 0.78, uProgress));

          gl_FragColor = vec4(col, clamp(length(col) * 1.8, 0.0, 1.0));
        }
      `

export const frameMaterialVertexShader = `
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        void main() {
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `

export const frameMaterialFragmentShader = `
        precision highp float;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        void main() {
          // Near-black obsidian wall — matches the dark monolithic architectural character
          vec3 baseBlack = vec3(0.00018, 0.00015, 0.00013);
          vec3 sunDir = normalize(vec3(-0.52, 0.72, 0.46));
          float nDotL = max(dot(vWorldNormal, sunDir), 0.0);
          // Only razor-thin top edge catches grazing light
          float isTopEdge = smoothstep(0.55, 0.92, vWorldNormal.y);
          float razorGlint = pow(nDotL, 10.0) * isTopEdge * 0.006;
          // Very subtle vertical face rim to show surface exists but not stand out
          float isVertFace = 1.0 - smoothstep(0.30, 0.65, abs(vWorldNormal.y));
          float subtleRim = pow(nDotL, 4.0) * isVertFace * 0.001;
          gl_FragColor = vec4(baseBlack + vec3(0.95, 0.93, 0.88) * (razorGlint + subtleRim), 0.0);
        }
      `

export const duneMatVertexShader = `
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `

export const duneMatFragmentShader = `
        precision highp float;
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        uniform float uTime;
        uniform float uProgress;
        uniform sampler2D uSandSurface;
        uniform vec3 uHeroFootprint;
        uniform sampler2D uRoofProfile;
        uniform float uOutlineRotation;
        uniform vec2 uPanelSize;

        uniform vec3 uLightPos0;
        uniform vec3 uLightColor0;
        uniform float uLightInt0;

        uniform vec3 uLightPos1;
        uniform vec3 uLightColor1;
        uniform float uLightInt1;

        uniform vec3 uLightPos2;
        uniform vec3 uLightColor2;
        uniform float uLightInt2;

        uniform vec3 uLightPos3;
        uniform vec3 uLightColor3;
        uniform float uLightInt3;

        vec3 calcPanelLight(vec3 lightPos, vec3 lightColor, float intensity, vec3 worldPos, vec3 worldNormal) {
          if (intensity <= 0.001) return vec3(0.0);

          vec2 panelFacing = normalize(lightPos.xz);
          vec2 tangent = vec2(panelFacing.y, -panelFacing.x);

          vec2 toPoint = worldPos.xz - lightPos.xz;
          float forwardDist = dot(toPoint, panelFacing);
          float lateralDist = dot(toPoint, tangent);

          // Emitter strictly emits forward from display face
          if (forwardDist < -0.05) return vec3(0.0);

          float halfW = uPanelSize.x * 0.50;
          float lateralMask = 1.0 - smoothstep(halfW - 0.20, halfW + 0.55, abs(lateralDist));
          float forwardFalloff = exp(-max(forwardDist - 0.05, 0.0) * 1.55) * smoothstep(-0.05, 0.20, forwardDist);
          float pool = forwardFalloff * lateralMask;

          vec3 L = normalize(vec3(lightPos.x, lightPos.y - uPanelSize.y * 0.15, lightPos.z) - worldPos);
          float NdotL = max(dot(worldNormal, L), 0.0);

          // Calibrated bounce: ~0.035 in linear space produces ~50 in sRGB at panel base
          return lightColor * (pool * (0.35 + 0.65 * NdotL) * intensity * 0.075);
        }

        void main() {
          vec2 p = vWorldPos.xz;

          // Micro wind ripples orient surface normal organically
          float surfaceScale = mix(0.125, 0.50, smoothstep(0.1, 0.85, uProgress));
          vec4 surface = texture2D(uSandSurface, p * surfaceScale);
          vec3 microNormal = surface.rgb * 2.0 - 1.0;
          vec3 sandNormal = normalize(vWorldNormal + vec3(microNormal.x, 0.0, microNormal.z) * 1.2);

          // Key raking sunlight from top-left sculpting the dunes — low angle for strong shadowing
          vec3 sunDir = normalize(vec3(-0.55, 0.26, 0.79));
          float rake = pow(max(dot(sandNormal, sunDir), 0.0), 2.2);

          float elevation = vWorldPos.y + 0.85;
          float troughAO = 0.45 + 0.55 * smoothstep(0.0, 0.13, elevation);

          // Deep charcoal-sand base albedo in linear space
          vec3 shadowAlbedo = vec3(0.018, 0.017, 0.016);
          vec3 crestAlbedo = vec3(0.060, 0.056, 0.050);
          float crestMask = smoothstep(0.015, 0.13, elevation);
          vec3 albedo = mix(shadowAlbedo, crestAlbedo, crestMask);

          vec3 col = albedo * (0.08 + rake * 0.92) * troughAO;

          // 1. Hero eclipse corona and raking ground light
          float angle = atan(p.y, p.x) - uOutlineRotation;
          vec2 packedRadius = texture2D(uRoofProfile, vec2(fract(angle / 6.2831853 + 0.5), 0.5)).rg;
          float roofRadius = uHeroFootprint.z * dot(packedRadius, vec2(65280.0, 255.0)) * (1.15 / 65535.0);
          float distFromRoof = max(length(p) - roofRadius, 0.0);

          vec2 dir = normalize(p + vec2(0.0001));
          // Ground corona accents match halo beam: concentrated upper-left with smaller secondary lobes
          float accents = 0.28
            + pow(max(dot(dir, vec2(-0.38, -0.92)), 0.0), 3.5) * 0.65
            + pow(max(dot(dir, vec2(-0.99, 0.14)), 0.0), 5.0) * 0.45
            + pow(max(dot(dir, vec2(0.70, 0.71)), 0.0), 6.0) * 0.22;

          float heroFade = 1.0 - smoothstep(0.15, 0.70, uProgress);
          float corona = exp(-distFromRoof * 1.05) * accents;
          float glints = pow(max(dot(dir, normalize(vec2(-0.99, 0.14))), 0.0), 100.0) * 0.70
            + pow(max(dot(dir, normalize(vec2(-0.38, -0.92))), 0.0), 90.0) * 0.55
            + pow(max(dot(dir, normalize(vec2(0.70, 0.71))), 0.0), 100.0) * 0.45;

          col += vec3(0.95, 0.93, 0.89) * (corona * (0.10 + rake * 0.65)
            + exp(-distFromRoof * 7.0) * glints * 2.2) * heroFade;

          // 2. Active artwork environmental light pools derived from actual image pixels
          vec3 panelBounce = vec3(0.0);
          panelBounce += calcPanelLight(uLightPos0, uLightColor0, uLightInt0, vWorldPos, sandNormal);
          panelBounce += calcPanelLight(uLightPos1, uLightColor1, uLightInt1, vWorldPos, sandNormal);
          panelBounce += calcPanelLight(uLightPos2, uLightColor2, uLightInt2, vWorldPos, sandNormal);
          panelBounce += calcPanelLight(uLightPos3, uLightColor3, uLightInt3, vWorldPos, sandNormal);

          vec3 reflected = panelBounce * troughAO;
          col += reflected;

          // Mineral granular micro-texture
          float mineral = texture2D(uSandSurface, p * 4.0).a;
          col *= 0.72 + mineral * 0.56;

          // 3. Near-field falloff: foreground falls smoothly into deep dark space for calm controls
          float foregroundFalloff = exp(-max(vWorldPos.z - 5.1, 0.0) * 1.6);
          col *= mix(1.0, foregroundFalloff, smoothstep(0.35, 0.85, uProgress));

          // Radial perimeter fade into deep space
          float rPav = length(p);
          float edgeFade = 1.0 - smoothstep(12.0, 16.0, rPav);
          col *= edgeFade;

          gl_FragColor = vec4(col, edgeFade);
        }
      `

export const bloomExtractMatVertexShader = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `

export const bloomExtractMatFragmentShader = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        void main() {
          vec4 col = texture2D(uTexture, vUv);
          float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
          // Isolate luminous display pixels (alpha = 0.15 denotes panel geometry)
          float isPanel = smoothstep(0.10, 0.14, col.a) * (1.0 - smoothstep(0.16, 0.20, col.a));
          float factor = smoothstep(0.42, 0.82, lum) * isPanel;
          gl_FragColor = vec4(col.rgb * factor, 1.0);
        }
      `

export const blurMatVertexShader = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `

export const blurMatFragmentShader = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform vec2 uDirection;

        void main() {
          // A contiguous 13-texel Gaussian folded into seven bilinear samples.
          // The paired taps must stay adjacent; scaling their spacing makes ghosts.
          vec3 col = texture2D(uTexture, vUv).rgb * 0.1553;
          col += texture2D(uTexture, vUv + uDirection * 1.4447).rgb * 0.2597;
          col += texture2D(uTexture, vUv - uDirection * 1.4447).rgb * 0.2597;
          col += texture2D(uTexture, vUv + uDirection * 3.3733).rgb * 0.1273;
          col += texture2D(uTexture, vUv - uDirection * 3.3733).rgb * 0.1273;
          col += texture2D(uTexture, vUv + uDirection * 5.3070).rgb * 0.03535;
          col += texture2D(uTexture, vUv - uDirection * 5.3070).rgb * 0.03535;
          gl_FragColor = vec4(col, 1.0);
        }
      `

export const compositeMaterialVertexShader = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `

export const compositeMaterialFragmentShader = `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D uSceneTexture;
        uniform sampler2D uBloomTexture;
        uniform sampler2D uTrailTexture;
        uniform float uTime;
        uniform vec2 uResolution;
        uniform float uWakeStrength;
        uniform float uFormation;
        uniform float uJourney;
        uniform float uBloomStrength;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        void main() {
          // 1. One-time liquid opening formation: coherent fluid distortion settling into architectural silhouette
          vec2 sceneUv = vUv;
          float formation = uFormation * (1.0 - smoothstep(0.0, 0.12, uJourney));
          if (formation > 0.001) {
            float width = 1.0 - formation * (0.35 + sin(vUv.y * 20.0 - uTime * 4.8) * 0.065);
            sceneUv.x = 0.5 + (vUv.x - 0.5) / width;
            sceneUv.x += sin(vUv.y * 24.0 + uTime * 4.2) * formation * 0.022;
            sceneUv.y += cos(vUv.x * 18.0 - uTime * 3.4) * formation * 0.016;
            sceneUv = clamp(sceneUv, vec2(0.001), vec2(0.999));
          }
          vec4 sceneCol = texture2D(uSceneTexture, sceneUv);

          // 2. Cursor wake: granular wake with underwater inertia, strictly masked to exterior sand terrain
          vec4 wake = texture2D(uTrailTexture, vUv);
          // Exterior sand terrain has alpha >= 0.50 (interior floor = 0.0, coping = 0.0, panels = 0.15)
          float surfaceMask = smoothstep(0.45, 0.90, sceneCol.a);
          float trail = wake.r * uWakeStrength * surfaceMask;
          vec2 flowUv = sceneUv;

          if (trail > 0.001) {
            vec2 texel = vec2(1.0 / 512.0);
            vec2 gradient = vec2(
              texture2D(uTrailTexture, vUv + vec2(texel.x, 0.0)).r - texture2D(uTrailTexture, vUv - vec2(texel.x, 0.0)).r,
              texture2D(uTrailTexture, vUv + vec2(0.0, texel.y)).r - texture2D(uTrailTexture, vUv - vec2(0.0, texel.y)).r
            );

            // Flow-carried advection: grains move with delayed motion and velocity
            vec2 flowOffset = (wake.ba * 0.004 + gradient * 0.016) * trail;
            flowUv = clamp(sceneUv + flowOffset, vec2(0.001), vec2(0.999));
            sceneCol.rgb = mix(sceneCol.rgb, texture2D(uSceneTexture, flowUv).rgb, min(trail * 0.85, 0.60));

            // Fine, density-dependent grains carried by delayed flow motion (using advected phase in wake.g)
            vec2 advectedGrainCoord = vUv - wake.ba * (0.025 + wake.g * 0.015);
            float grain1 = hash(floor(advectedGrainCoord * uResolution * 0.85));
            float grain2 = hash(floor(advectedGrainCoord * uResolution * 1.35 + vec2(13.4, 47.1)));
            float combinedGrain = grain1 * 0.65 + grain2 * 0.35;

            float density = clamp(trail * 1.30, 0.0, 1.0);
            float particleThreshold = mix(0.78, 0.30, pow(density, 0.85));
            float particleMask = smoothstep(particleThreshold, particleThreshold + 0.10, combinedGrain);
            float sandParticles = particleMask * density;

            float lum = dot(sceneCol.rgb, vec3(0.299, 0.587, 0.114));
            vec3 sandDustCol = mix(vec3(0.18, 0.18, 0.17), sceneCol.rgb * 0.35, smoothstep(0.03, 0.35, lum));
            sceneCol.rgb = mix(sceneCol.rgb, sandDustCol, sandParticles * 0.80);
          }

          // 3. Atmospheric bloom halo
          if (uBloomStrength > 0.0) {
            vec3 bloom = texture2D(uBloomTexture, flowUv).rgb;
            float bloomMask = mix(surfaceMask, 1.0, smoothstep(0.40, 0.90, uJourney));
            sceneCol.rgb += bloom * 0.38 * bloomMask * uBloomStrength;
          }

          gl_FragColor = vec4(sceneCol.rgb, 1.0);
          #include <colorspace_fragment>
        }
      `
