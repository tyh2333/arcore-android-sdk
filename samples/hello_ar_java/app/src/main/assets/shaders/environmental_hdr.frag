#version 300 es
///* inputs :  in */
in vec3 v_ViewPosition;
in vec3 v_ViewNormal;
in vec2 v_TexCoord;
/* outputs:  out */
layout(location = 0) out vec4 gl_FragColor;

/* TODO for testing: */
//varying vec3 v_ViewPosition;
//varying vec3 v_ViewNormal;
//varying vec2 v_TexCoord;




precision mediump float;


uniform vec3 u_LightIntensity;  // The intensity of the main directional light.
uniform vec4 u_ViewLightDirection; // The direction of the main directional light in view space.

// The coefficients for the spherical harmonic function which models the diffuse
// irradiance of a distant environmental light for a given surface normal in
// world space. These coefficients must be premultiplied with their
// corresponding spherical harmonics constants. See
// HelloArActivity.updateSphericalHarmonicsCoefficients for more information.
uniform vec3 u_SphericalHarmonicsCoefficients[9];

// Inverse view matrix. Used for converting normals back into world space for
// environmental radiance calculations.
uniform mat4 u_ViewInverse;

// If the current light estimate is valid. Used to short circuit the entire
// shader when the light estimate is not valid.
uniform bool u_LightEstimateIsValid;

struct ShadingParameters {
  // Halfway here refers to halfway between the view and light directions.
  float normalDotView;
  float normalDotHalfway;
  float normalDotLight;
  float viewDotHalfway;
  float oneMinusNormalDotHalfwaySquared;

  // These unit vectors are in world space and are used for the environmental
  // lighting math.
  vec3 worldNormalDirection;
  vec3 worldReflectDirection;
};

vec3 Pbr_CalculateMainLightRadiance(const ShadingParameters shading, const vec3 mainLightIntensity){
    const float kPi = 3.14159265359;
    return mainLightIntensity * shading.normalDotLight / kPi;
}

vec3 Pbr_CalculateDiffuseEnvironmentalRadiance(const vec3 normal,
                                               const vec3 coefficients[9]) {
  // See HelloArActivity.updateSphericalHarmonicsCoefficients() for more information about this calculation.
  vec3 radiance = coefficients[0] + coefficients[1] * (normal.y) +
                  coefficients[2] * (normal.z) + coefficients[3] * (normal.x) +
                  coefficients[4] * (normal.y * normal.x) +
                  coefficients[5] * (normal.y * normal.z) +
                  coefficients[6] * (3.0 * normal.z * normal.z - 1.0) +
                  coefficients[7] * (normal.z * normal.x) +
                  coefficients[8] * (normal.x * normal.x - normal.y * normal.y);
//        return vec3(0.5, 0.0, 0.0);

    return max(radiance, 0.0);
    return radiance;
}

vec3 Pbr_CalculateEnvironmentalRadiance( const ShadingParameters shading,
                                         const vec3 sphericalHarmonicsCoefficients[9]) {
  // The lambertian diffuse BRDF term (1/pi) is baked into HelloArActivity.sphericalHarmonicsFactors.
  return Pbr_CalculateDiffuseEnvironmentalRadiance(shading.worldNormalDirection,
                                                   sphericalHarmonicsCoefficients);
}

ShadingParameters Pbr_CreateShadingParameters(const  vec3 viewNormal,
                                 const  vec3 viewPosition,
                                 const  vec4 viewLightDirection,
                                 const  mat4 viewInverse //, out ShadingParameters shading
) {
    ShadingParameters shading;
  vec3 normalDirection  = normalize(viewNormal);
  vec3 viewDirection    = -normalize(viewPosition);
  vec3 lightDirection   = normalize(viewLightDirection.xyz);
  vec3 halfwayDirection = normalize(viewDirection + lightDirection);

//   Clamping the minimum bound yields better results with values less than or
//   equal to 0, which would otherwise cause discontinuity in the geometry
//   factor. Neubelt and Pettineo 2013, "Crafting a Next-gen Material Pipeline
//   for The Order: 1886"
  shading.normalDotView    = max(dot(normalDirection, viewDirection), 1e-4);
  shading.normalDotHalfway = clamp(dot(normalDirection, halfwayDirection), 0.0, 1.0);
  shading.normalDotLight   = clamp(dot(normalDirection, lightDirection), 0.0, 1.0);
  shading.viewDotHalfway   = clamp(dot(viewDirection, halfwayDirection), 0.0, 1.0);

  // The following calculation can be proven as being equivalent to 1-(N.H)^2 by
  // using Lagrange's identity.
  //
  // ||a x b||^2 = ||a||^2 ||b||^2 - (a . b)^2
  //
  // Since we're using unit vectors: ||N x H||^2 = 1 - (N . H)^2
  //
  // We are calculating it in this way to preserve floating point precision.
  vec3 NxH = cross(normalDirection, halfwayDirection);
  shading.oneMinusNormalDotHalfwaySquared = dot(NxH, NxH);
    shading.worldNormalDirection = (viewInverse * vec4(normalDirection, 0.0)).xyz;
//    shading.worldNormalDirection = (vec4(normalDirection, 0.0)).xyz; // TODO: new for test
//    shading.worldNormalDirection = (vec4(normalDirection, 0.0)).xyz; // TODO: new for test
  vec3 reflectDirection = reflect(-viewDirection, normalDirection);
  shading.worldReflectDirection = (viewInverse * vec4(reflectDirection, 0.0)).xyz;
    return shading;
}

vec3 LinearToSrgb(const vec3 color) {
  vec3 kGamma = vec3(1.0 / 2.2);
  return clamp(pow(color, kGamma), 0.0, 1.0);
}

void main() {
  // Mirror texture coordinates over the X axis
  vec2 texCoord = vec2(v_TexCoord.x, 1.0 - v_TexCoord.y);

  // Skip all lighting calculations if the estimation is not valid.
//  if (!u_LightEstimateIsValid) { o_FragColor = vec4(1.0, 1.0, 1.0, 1.0);  return; }

  ShadingParameters shading = Pbr_CreateShadingParameters(  v_ViewNormal,
                                                            v_ViewPosition,
                                                            u_ViewLightDirection,
                                                            u_ViewInverse); // , shading);

  // Combine the radiance contributions of both the main light and environment
  vec3 mainLightRadiance =  Pbr_CalculateMainLightRadiance(shading, u_LightIntensity);
  vec3 environmentalRadiance = Pbr_CalculateEnvironmentalRadiance(shading, u_SphericalHarmonicsCoefficients);

//    vec3 radiance = mainLightRadiance + environmentalRadiance; /* (1) Directional light + SH Light */
//    vec3 radiance = mainLightRadiance;        /* (2) only Directional Light */
    vec3 radiance = environmentalRadiance;    /* (3) only SH Light*/

  // Convert final color to sRGB color space
    gl_FragColor = vec4(LinearToSrgb(radiance), 1.0);
//    gl_FragColor = vec4(radiance, 1.0);
}
