function reattachInstance() {
  if (figma.currentPage.selection.length !== 1 || figma.currentPage.selection[0].type !== "FRAME") {
    return "Please, select a frame first";
  }
  const selectedFrame = figma.currentPage.selection[0];
  const instanceReference = figma.currentPage.findOne(node => node.type === "INSTANCE" && node.name == selectedFrame.name);
  if (instanceReference === null) {
    return "Couldn't find an instance with the same frame name."
  }

  let instanceClone = instanceReference.masterComponent.createInstance();
  selectedFrame.parent.appendChild(instanceClone);
  instanceClone.x = selectedFrame.x;
  instanceClone.y = selectedFrame.y;
  instanceClone.resize(selectedFrame.width, selectedFrame.height);
  selectedFrame.remove();
  figma.currentPage.selection = [instanceClone];
  return `Frame replaced by "${instanceClone.name}" instance.`
}
figma.closePlugin(reattachInstance());

