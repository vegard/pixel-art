#version 300 es

precision mediump float;

uniform vec2 iResolution;

uniform float angle;
uniform float width;
uniform float levels;
uniform float sharpness;
uniform float gamma;

uniform sampler2D dither_texture;

in vec4 vert_pos;

out vec4 fragColor;

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
    const float scale = 4.;

    vec2 uv = .5 * vert_pos.xy * iResolution / scale;
    uv = floor(uv);

    float c = cos(radians(angle));
    float s = sin(radians(angle));

    float v = dot(vec2(s, c), uv) / (iResolution.y / scale);
    v = clamp(v / width + .5, 0., 1.);

    // quantization
    v = dither(uv, levels - 1., 1. - sharpness, v);

    vec3 col = vec3(1.) * pow(v, 1. / gamma);
    fragColor = vec4(col, 1.);
}
