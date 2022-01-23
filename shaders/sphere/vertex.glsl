#version 300 es
in vec4 a_position;

out vec4 vert_pos;

void main() {
    vert_pos = a_position;
    gl_Position = a_position;
}
