# Image assets

The teaser page uses six reference mood shots at low-resolution (338 × 600 JPEGs
from the marketing team). Each shot carries burned-in "YAS POINT" wordmark at
the top and a tagline in the middle — both are hidden at runtime by CSS scrims
in `MoodPoster.astro` / `Hero.astro`. Do **not** attempt to remove or edit the
source JPEGs — the scrim overlay is intentional.

## Files

| File           | Section                              | Original tagline (hidden)            | Our tagline                            |
| -------------- | ------------------------------------ | ------------------------------------ | -------------------------------------- |
| `horizon.jpeg` | Hero + branded residences MoodStory  | *Where the sea meets the horizon*    | *A coast still being written.*         |
| `lights.jpeg`  | Extraordinary lights MoodStory       | *Extraordinary lights up the night*  | *Extraordinary lights up the night.*   |
| `garden.jpeg`  | The Canopies (Chapter One) MoodStory | *Where the garden glows to life*     | *Where the garden glows to life.*      |
| `marina.jpeg`  | Private marina MoodStory             | *The view is the occasion*           | *The view is the occasion.*            |
| `tide.jpeg`    | Five-star hotel MoodStory            | *Where taste meets the tide*         | *Where taste meets the tide.*          |
| `beach.jpeg`   | Public beach / private bay MoodStory | *The beach shares your address*      | *The beach shares your address.*       |

## Scrim strategy (documented so future editors don't break it)

Every mood image contains **two branded text blocks** that must never be visible:
1. **Top wordmark** ("YAS POINT") at roughly **8–28%** of image height
2. **Middle tagline** at roughly **48–72%** of image height

Both `Hero.astro` and `MoodPoster.astro` layer four gradient/solid overlays that
cover these bands and leave a clean ~16% visible band for the atmospheric photo
between them. If you swap in higher-resolution replacement art without burned-in
text, you can drop the scrims and let the imagery breathe.

## When real renders arrive

Replace files by name — no code changes needed. Target: **WebP or AVIF at
1200 × 1600 (3:4)**, ≤ 200 KB. If new art has no burned-in text, edit the two
components above to remove the scrim `<div>`s marked with the top/middle bands.
