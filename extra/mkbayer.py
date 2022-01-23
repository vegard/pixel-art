import os
import sys

import PIL.Image

# https://en.wikipedia.org/wiki/Ordered_dithering

M_prev = [0]

for i in range(4):
    n = 1 << i
    nn = 2 * n

    M = [0 for j in range(nn * nn)]

    for y in range(n):
        for x in range(n):
            M[nn * (y + 0) + (x + 0)] = 4 * M_prev[n * y + x] + 0
            M[nn * (y + 0) + (x + n)] = 4 * M_prev[n * y + x] + 2
            M[nn * (y + n) + (x + 0)] = 4 * M_prev[n * y + x] + 3
            M[nn * (y + n) + (x + n)] = 4 * M_prev[n * y + x] + 1

    #print(M)

    im = PIL.Image.new('RGB', (nn, nn))
    data = [int(255. * x / len(M)) for x in M]
    #print(data)
    im.putdata(data)
    im.save('bayer-{}.png'.format(nn))

    M_prev = M
