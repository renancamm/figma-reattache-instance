![logo](https://github.com/renancamm/figma-reattache-instance/blob/master/banner_2048x1024.png?raw=true)

[![Figma Plugin](https://img.shields.io/badge/Figma_Plugin-%235551ff?logo=figma&logoColor=white)](https://www.figma.com/community/plugin/741415678427267506)
[![Plugin installs](https://img.shields.io/badge/dynamic/json?color=%235551ff&label=Installs&query=%24.meta.plugin.install_count&url=https%3A%2F%2Fwww.figma.com%2Fapi%2Fplugins%2F741415678427267506%2Fversions
)](https://www.figma.com/community/plugin/741415678427267506)
[![Plugin likes](https://img.shields.io/badge/dynamic/json?color=%235551ff&label=Likes&query=%24.meta.plugin.like_count&url=https%3A%2F%2Fwww.figma.com%2Fapi%2Fplugins%2F741415678427267506%2Fversions)](https://www.figma.com/community/plugin/741415678427267506)




# Reattach Instance (Figma Plugin)
Relink a frame to a component by searching for similar instances.

## Use cases:
- Copying a nested component
- Moving the master component to a different file
- Turning a set of similar frames into a component
- Turning detached instances back into instances

Get it here: https://www.figma.com/c/plugin/741415678427267506/Reattach-Instance


## How it works:
1. Select frames (that used to be instances)
2. Click "Plugin/Reattach instance"
3. Plugin finds instances or master components with the same name
4. New instance is created for each corresponding frame
5. The selected frames are replaced by instances 🎉

👉 *NEW:* Overrides will now be applied to instances!

## Known problems:
- Relies too much on layer naming
- Needs to have an instance/master as a reference on the same file
- Doesn't work all the time with team libraries

Feel free to contribute 😅


---

Contributors: 
- [mikeozornin](https://github.com/mikeozornin)
- [bespoyasov](https://github.com/bespoyasov)
- [zyumbik](https://twitter.com/zyumbik)




