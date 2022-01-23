#version 300 es

precision mediump float;

uniform vec2 iResolution;
uniform vec2 iMouse;
uniform vec2 iMouseSum;

uniform float levels;
uniform float sharpness;

uniform sampler2D dither_texture;

in vec4 vert_pos;

out vec4 fragColor;

// intersect ray with sphere to find
//  - the distance to the sphere
//  - and the point of intersection on the sphere
// http://viclw17.github.io/2018/07/16/raytracing-ray-sphere-intersection/
float intersect_ray_sphere(vec3 origin, vec3 direction, vec3 center, float radius)
{
    vec3 oc = origin - center;
    float a = dot(direction, direction);
    float b = 2. * dot(oc, direction);
    float c = dot(oc, oc) - radius * radius;
    float disc = b * b - 4. * a * c;
    if (disc < 0.) {
        // no intersection?
        return -1.;
    } else {
        return (-b - sqrt(disc)) / (2. * a);
    }
}

// http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
vec3 rayDirection(float fieldOfView, vec2 size, vec2 fragCoord) {
    vec2 xy = fragCoord - size / 2.0;
    float z = size.y / tan(radians(fieldOfView) / 2.0);
    return normalize(vec3(xy, -z));
}

float dither(vec2 uv, float levels, float sharpness, float intensity)
{
    ivec2 tex_size = textureSize(dither_texture, 0);
    ivec2 tex_uv = ivec2(mod(uv.x, float(tex_size.x)), mod(uv.y, float(tex_size.y)));
    float threshold = texelFetch(dither_texture, tex_uv, 0).r - .5;
    float major = floor(levels * intensity);
    float minor = float(fract(levels * intensity) > .5 + sharpness * threshold);
    return (major + minor) / levels;
}

void main() {
    float phi = radians(-180.) * (iMouseSum.x - .6);
    vec3 light_pos = normalize(vec3(cos(phi), .6 + 5. * iMouseSum.y, sin(phi)));

    vec2 uv = (.5 * vert_pos.xy + vec2(.5)) * iResolution;
    vec3 pos = vec3(0, 0, 12.);
    vec3 dir = rayDirection(90., iResolution, uv);
    float t = intersect_ray_sphere(pos, dir, vec3(0, 0, 0), 4.);
    if (t >= 0.) {
        vec3 p = pos + dir * t;
        float a = max(0., dot(normalize(p), light_pos));
        a = dither(uv, levels - 1., 1. - sharpness, a);
        fragColor = vec4(vec3(1.) * a, 1.);
    } else {
        fragColor = vec4(0);
    }
}
