function reattachInstance() {
    let skippedCount = 0;
    let processedCount = 0;
    let originalInstances = {};
    if (figma.currentPage.selection.length == 0) {
        return "Please, select a frame first";
    }
    const clonedSelection = Object.assign([], figma.currentPage.selection);
    for (let frame of clonedSelection) {
        let masterComponent;
        if (frame.type !== "FRAME" && frame.type !== "GROUP") {
            skippedCount += 1;
            continue;
        }
        if (!(frame.name in originalInstances)) {
            masterComponent = figma.root.findOne(node => node.type === "COMPONENT" && node.name == frame.name);
            originalInstances[frame.name] = masterComponent;
        }
        else {
            masterComponent = originalInstances[frame.name];
        }
        if (masterComponent != null) {
            let instanceClone = masterComponent.createInstance();
            frame.parent.appendChild(instanceClone);
            instanceClone.x = frame.x;
            instanceClone.y = frame.y;
            instanceClone.resize(frame.width, frame.height);
            frame.remove();
            processedCount += 1;
            continue;
        }
        skippedCount += 1;
        continue;
    }
    return `${processedCount} processed, ${skippedCount} skipped`;
}
figma.closePlugin(reattachInstance());
