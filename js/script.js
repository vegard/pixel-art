// https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
function resize(canvas, width, height) {
  canvas.width = width;
  canvas.height = height;
}

// https://webglfundamentals.org/webgl/lessons/webgl-fundamentals.html
function createShader(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
 
  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }
 
  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL
function createTexture(gl, render, color=[255, 255, 255, 255]) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array(color);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                pixel);

  return texture;
}

function loadTexture(gl, texture, render, url) {
  const level = 0;
  const internalFormat = gl.RGBA;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;

  const image = new Image();
  image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);

    //gl.generateMipmap(gl.TEXTURE_2D);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    render();
  };
  image.src = url;
}

function instantiateCanvas(div) {
  var name = div.getAttribute('data-shader');
  var canvas = div.querySelector('canvas');
  var inputs = div.querySelectorAll('input, select')

  var shader = JSON.parse(JSON.stringify(shaders[name]));

  var gl = canvas.getContext("webgl2");
  if (!gl) {
    console.log("Unable to create WebGL context");
    return;
  }

  // Initialize common vertex buffers

  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  var positions = [
    -1, -1,
    -1, 1,
    1, 1,

    -1, -1,
    1, -1,
    1, 1,
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  var output_textures = [];

  // Set up shader passes
  for (let [pass_i, pass] of shader.entries()) {
    if (pass_i < shader.length - 1) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, ...pass.size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

      output_textures[pass.name] = texture;

      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      pass.framebuffer = fb;
    } else {
      pass.framebuffer = null;
    }

    vertex_shader = createShader(gl, gl.VERTEX_SHADER, pass.vertex);
    fragment_shader = createShader(gl, gl.FRAGMENT_SHADER, pass.fragment);
    pass.program = createProgram(gl, vertex_shader, fragment_shader);

    for (const texture of pass.textures) {
      if (texture.hasOwnProperty('file')) {
        // NOTE: the actual texture data is loaded below
        texture.texture = createTexture(gl);
      } else if (texture.hasOwnProperty('buffer')) {
        texture.texture = output_textures[texture.buffer];
      } else if (texture.hasOwnProperty('choice')) {
        for (choice_value of texture.choice) {
          choice_value.texture = createTexture(gl);
        }
      }
    }
  }

  let mouse = [0, 0, false];
  let mouseSum = [0, 0];

  var render = function() {
    for (pass of shader) {
      var program = pass.program;

      // pass.framebuffer should (will) be null in the last pass,
      // enabling us to render to the canvas itself
      gl.bindFramebuffer(gl.FRAMEBUFFER, pass.framebuffer);

      // TODO: use framebuffer size
      gl.viewport(0, 0, ...pass.size);

      var clearBits = 0;

      if (pass.hasOwnProperty('clearColor')) {
        gl.clearColor(...pass.clearColor);
        clearBits |= gl.COLOR_BUFFER_BIT;
      }

      if (pass.hasOwnProperty('clearDepth')) {
        gl.clearDepth(pass.clearDepth);
        clearBits |= gl.DEPTH_BUFFER_BIT;
      }

      if (clearBits !== 0) {
        gl.clear(clearBits);
      }

      gl.useProgram(program);

      var iResolutionUniformLocation = gl.getUniformLocation(program, 'iResolution');
      if (iResolutionUniformLocation !== null) {
        gl.uniform2fv(iResolutionUniformLocation, pass.size);
      }

      var mouseUniformLocation = gl.getUniformLocation(program, 'iMouse')
      if (mouseUniformLocation !== null) {
        gl.uniform2fv(mouseUniformLocation, [mouse[0], mouse[1]]);
      }

      var mouseSumUniformLocation = gl.getUniformLocation(program, 'iMouseSum')
      if (mouseSumUniformLocation !== null) {
        gl.uniform2fv(mouseSumUniformLocation, [mouseSum[0], mouseSum[1]]);
      }

      // TODO: we shouldn't be "wasting" a texture unit for each
      // choice element that doesn't get used in the shader
      for (let [texture_i, texture] of pass.textures.entries()) {
        var textureUniformLocation = gl.getUniformLocation(program, texture.name);
        if (textureUniformLocation !== null) {
          if (texture.hasOwnProperty('choice')) {
            index = div.querySelector("select[name='" + texture.name + "']").value;
            tex = texture.choice[index].texture;
          } else {
            tex = texture.texture;
          }

          gl.activeTexture(gl.TEXTURE0 + texture_i);
          gl.bindTexture(gl.TEXTURE_2D, tex);

          gl.uniform1i(textureUniformLocation, texture_i);
        }
      }

      for (const input of inputs) {
        var input_name = input.getAttribute('name');
        if (input.getAttribute('type') != 'radio' || input.checked) {
          var inputUniformLocation = gl.getUniformLocation(program, input_name)
          if (inputUniformLocation !== null) {
            gl.uniform1f(inputUniformLocation, input.value);
          }
        }
      }

      var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
      if (positionAttributeLocation !== null) {
        gl.enableVertexAttribArray(positionAttributeLocation);

        // Bind the position buffer.
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        var size = 2;          // 2 components per iteration
        var type = gl.FLOAT;   // the data is 32bit floats
        var normalize = false; // don't normalize the data
        var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        var offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    }
  };

  // Load file textures
  for (pass of shader) {
    pass.textures_by_name = {};
    for (texture of pass.textures) {
      if (texture.hasOwnProperty('file')) {
        loadTexture(gl, texture.texture, render, 'textures/' + texture.file);
      }

      if (texture.hasOwnProperty('choice')) {
        for (choice_value of texture.choice) {
          loadTexture(gl, choice_value.texture, render, 'textures/' + choice_value.file);
        }
      }

      //pass.textures_by_name[texture.name] = texture;
    }
  }

  // Register mouse event handlers
  canvas.addEventListener('mousedown', e => {
    const size = shader[shader.length - 1].size;

    mouse[0] = e.offsetX / size[0];
    mouse[1] = (size[1] - e.offsetY) / size[1];
    mouse[2] = true;
    render();
  });

  canvas.addEventListener('mousemove', e => {
    if (mouse[2] === true) {
      const size = shader[shader.length - 1].size;

      mouseSum[0] = mouseSum[0] + (e.offsetX / size[0] - mouse[0]);
      mouseSum[1] = mouseSum[1] + ((size[1] - e.offsetY) / size[1] - mouse[1]);
      mouse[0] = e.offsetX / size[0];
      mouse[1] = (size[1] - e.offsetY) / size[1];
      render();
    }
  });

  canvas.addEventListener('mouseup', e => {
    const size = shader[shader.length - 1].size;

    mouse[0] = e.offsetX / size[0];
    mouse[1] = (size[1] - e.offsetY) / size[1];
    mouse[2] = false;
    render();
  });

  // Register event handlers that need to trigger rendering
  for (const input of inputs) {
    input.oninput = render;
  }

  resize(canvas, ...shader[shader.length - 1].size);
  render();
}

window.onload = function() {
  document.querySelectorAll(".canvas").forEach(instantiateCanvas);
}
