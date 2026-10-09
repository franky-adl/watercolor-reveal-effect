## Project Start

- Got the paper rendering code from https://github.com/msurguy/watercolor-playground
- The intended watercolor reveal effect https://www.youtube.com/live/ggruH0fHPOM
- the initial code only has value noise and fbm that revolves on that, I've added gradient noise and simplex noise as well. For the cold press texture, I've tested with both and I like gradient noise more. The key to get rid of the vertical line artifacts to do p = rot \* p; before each gnoise sampling.
- I've also added gnoise for uBump so as to make the bumps look more organic instead of uniform strength all over the paper.
- I've also added a lightness function to introduce more shades in the bottom left of the texture which has subtly been tinted with blue. For now I'm quite happy with the realistic cold press texture.
