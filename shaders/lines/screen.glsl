#version 300 es

precision mediump float;

uniform vec2 iResolution;

uniform float scale;
uniform float angle;
uniform float thickness;
uniform float levels;
uniform float antialiasing;
uniform float threshold;
uniform float gamma;

in vec4 vert_pos;

out vec4 fragColor;

void main() {
    vec2 line_uv = (.5 * vert_pos.xy) * iResolution / scale;
    line_uv = floor(line_uv);

    vec2 line_coef = vec2(sin(radians(angle)), cos(radians(angle)));
    float line_d = abs(dot(line_uv, line_coef)) - .5 * thickness;
    float line_v = smoothstep(-1. * antialiasing, 1. * antialiasing, line_d);

    // quantization
    line_v = round(levels * line_v + threshold) / levels;

    vec3 line_col = vec3(1.) * pow(line_v, 1. / gamma);
    fragColor = vec4(line_col, 1.);
}
