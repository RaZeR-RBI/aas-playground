# AAS Bot Navigation Viewer

This tool allows you to view navigation meshes and data stored in AAS files
generated by [bspc](https://github.com/TTimo/bspc) (mostly used in Quake 3 and
derived games).

![Screenshot of q3dm5](screenshot.png)

## Features
Only version 5 (latest) is supported for now. Version 4 support is planned.

* Reachability display grouped by type (shown as colored arrows)
* Ground and liquid face display
* Cluster portal rendering
* Editable colors and opacity, toggleable visibility

## Quake 2 support
If you want to generate AAS for a Quake 2 map, you can try out my
[bspc fork](https://github.com/RaZeR-RBI/bspc) which adds support for
Quake 2's collision model for reachability calculation.

## Development
Clone, install dependencies and run a dev server:
```sh
npm install
npm run dev
```