#! /usr/bin/env python3

import argparse
import errno
import glob
import os
import sys
import json
import yaml

import jinja2
import PIL.Image
import numpy

# https://stackoverflow.com/a/600612
def mkdirp(path):
    try:
        os.makedirs(path)
    except OSError as e:
        if e.errno == errno.EEXIST and os.path.isdir(path):
            pass
        else:
            raise

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('-o', '--output', default='output')
    parser.add_argument('index', metavar='FILE')
    parser.add_argument('pages', metavar='PAGE', nargs='*')

    args = parser.parse_args()

    output_dir = args.output
    mkdirp(output_dir)

    js_dir = os.path.join(output_dir, 'js')
    mkdirp(js_dir)

    css_dir = os.path.join(output_dir, 'css')
    mkdirp(css_dir)

    env = jinja2.Environment(loader=jinja2.FileSystemLoader('.'))
    index_template = env.get_template(args.index)

    with open(os.path.join(output_dir, 'index.html'), 'w') as f:
        f.write(index_template.render(pages=args.pages))

    with open(os.path.join(css_dir, 'style.css'), 'w') as f:
        f.write(env.get_template('css/style.css').render())

    with open(os.path.join(js_dir, 'script.js'), 'w') as f:
        f.write(env.get_template('js/script.js').render())

    textures_dir = os.path.join(output_dir, 'textures', 'common')
    mkdirp(textures_dir)

    for path in glob.glob(os.path.join('common', '*.png')):
        im = PIL.Image.open(path)
        im.save(os.path.join(textures_dir, os.path.basename(path)))

    result = []

    for shader in os.listdir('shaders'):
        if shader in ['common']:
            raise RuntimeError('invalid shader name: {}'.format(shader))

        shader_dir = os.path.join('shaders', shader)

        # returns (input path, output path)
        def search(name):
            path = os.path.join(shader_dir, name)
            if os.path.exists(path):
                return path, os.path.join(shader, name)

            path = os.path.join('common', name)
            if os.path.exists(path):
                return path, path

            raise RuntimeError('File not found: {}'.format(name))

        with open(os.path.join(shader_dir, 'shader.yaml')) as f:
            data = yaml.load(f)

        for buf in data:
            vertex_shader_name = buf.get('vertex', 'vertex.glsl')
            vertex_shader_path, _ = search(vertex_shader_name)
            vertex_shader = open(vertex_shader_path).read()
            buf['vertex'] = vertex_shader

            fragment_shader_name = buf.get('fragment', 'fragment.glsl')
            fragment_shader_path, _ = search(fragment_shader_name)
            fragment_shader = open(fragment_shader_path).read()
            buf['fragment'] = fragment_shader

            textures = buf.setdefault('textures', [])
            for texture in textures[::]:
                name = texture.get('name', 'tex')

                texture_file = texture.get('file')
                texture_buffer = texture.get('buffer')
                texture_choice = texture.get('choice')

                if texture_file is not None:
                    texture_path, texture['file'] = search(texture_file)
                elif texture_buffer is not None:
                    pass
                elif texture_choice is not None:
                    for e in texture_choice:
                        texture_path, e['file'] = search(e['file'])

        textures_dir = os.path.join(output_dir, 'textures', shader)
        mkdirp(textures_dir)

        for path in glob.glob(os.path.join(shader_dir, '*.png')):
            # Premultiply alpha

            # https://stackoverflow.com/a/9146202
            im = PIL.Image.open(path).convert('RGBA')
            premult = numpy.fromstring(im.tobytes(), dtype=numpy.uint8)
            alphaLayer = premult[3::4] / 255.0
            premult[0::4] = premult[0::4] * alphaLayer
            premult[1::4] = premult[1::4] * alphaLayer
            premult[2::4] = premult[2::4] * alphaLayer
            im_out = PIL.Image.frombytes("RGBA", im.size, premult.tostring())
            im_out.save(os.path.join(textures_dir, os.path.basename(path)))

        result.append((shader, data))

    with open(os.path.join(js_dir, 'shaders.js'), 'w') as f:
        print("var shaders = [];", file=f)

        for name, shader in result:
            print("shaders['{}'] = {};".format(name, json.dumps(shader)), file=f)

if __name__ == '__main__':
    main()
