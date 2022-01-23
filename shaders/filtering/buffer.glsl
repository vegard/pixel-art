#version 300 es

precision mediump float;

uniform vec2 iResolution;

uniform float zoom;
uniform float filtering;

uniform sampler2D tex;

in vec4 vert_pos;

out vec4 fragColor;

// https://www.shadertoy.com/view/ldlSzS
vec4 textureAA(sampler2D tex, vec2 uv) {
	ivec2 itexsize = textureSize(tex, 0);
	vec2 texsize = vec2(itexsize);

	uv *= texsize;
	ivec2 iuv = ivec2(floor(uv));

	vec2 border = .5 * fwidth(uv);

	vec2 uvf = fract(uv);

	// the main color of the texel, assuming we're not at a border
	vec4 col = texelFetch(tex, iuv, 0);

	vec4 xcol = col;
	if (uvf.x < border.x && iuv.x > 0)
	    xcol = mix(texelFetchOffset(tex, iuv, 0, ivec2(-1, 0)), col, uvf.x / border.x);
	else if (1. - uvf.x < border.x && iuv.x < itexsize.x - 1)
	    xcol = mix(texelFetchOffset(tex, iuv, 0, ivec2(1, 0)), col, (1. - uvf.x) / border.x);

	vec4 ycol = col;
	if (uvf.y < border.y && iuv.y > 0)
	    ycol = mix(texelFetchOffset(tex, iuv, 0, ivec2(0, -1)), col, uvf.y / border.y);
	else if (1. - uvf.y < border.y && iuv.y < itexsize.y - 1)
	    ycol = mix(texelFetchOffset(tex, iuv, 0, ivec2(0, 1)), col, (1. - uvf.y) / border.y);

	return mix(xcol, ycol, .5);
}

void main() {
    vec2 uv = (.5 * vert_pos.xy) * iResolution / vec2(textureSize(tex, 0)) / zoom + .5;

    if (filtering == 0.) {
      fragColor = texelFetch(tex, ivec2(vec2(textureSize(tex, 0)) * vec2(uv.x, 1. - uv.y)), 0);
    } else if (filtering == 1.) {
      fragColor = texture(tex, vec2(uv.x, 1. - uv.y));
    } else if (filtering == 2.) {
      fragColor = textureAA(tex, vec2(uv.x, 1. - uv.y));
    }
}
