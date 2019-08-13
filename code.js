function reattachInstance() {
    let skippedCount = 0;
    let processedCount = 0;
    const clonedSelection = Object.assign([], figma.currentPage.selection);
    for (let index in clonedSelection) {
        let frame = clonedSelection[index];
        let instanceReference = figma.currentPage.findOne(node => node.type === "INSTANCE" && node.name == frame.name);
        if (instanceReference != null) {
            let instanceClone = instanceReference.masterComponent.createInstance();
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
    return `${processedCount} frames processed, ${skippedCount} skipped`;
}
figma.closePlugin(reattachInstance());
