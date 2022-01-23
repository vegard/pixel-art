#version 300 es

precision mediump float;

uniform vec2 iResolution;

uniform sampler2D tex;

in vec4 vert_pos;

out vec4 fragColor;

float sdCheckerboard (in vec2 p)
{
    vec2 q = mod(p, 1.) - .5;
    vec2 r = step(1., mod(p, 2.));

    // are we inside or outside? (this is either -1. or 1.)
    float side = 2. * (r.y - r.x) * (r.y - r.x) - 1.;

    vec2 d = abs(q) - .5;
    return side * max(d.x, d.y);
}

void main() {
    vec2 vignette_uv = .5 * vert_pos.xy + vec2(.5);

    float scale = float(textureSize(tex, 0).y);
    vec2 grid_uv = (.5 * vert_pos.xy + vec2(0, .5)) * iResolution / iResolution.y * scale;
    float grid_d = sdCheckerboard(grid_uv);
    float grid_a = smoothstep(-1.5, 1.5, grid_d * iResolution.y);
    grid_a *= pow( 20.*vignette_uv.x*(1.0-vignette_uv.x)*vignette_uv.y*(1.0-vignette_uv.y), 1.);
    vec3 grid_rgb = mix(vec3(1.), vec3(183., 237., 255.) / vec3(255.), grid_a);

    vec2 uv = (.5 * vert_pos.xy + vec2(0, .5)) * iResolution / iResolution.y + vec2(.5, 0);
    vec4 tex_rgba = texture(tex, uv);

    fragColor = vec4(mix(grid_rgb, tex_rgba.rgb, tex_rgba.a), 1.);
}
