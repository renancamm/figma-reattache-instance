type MasterOrInstance = InstanceNode | ComponentNode;

function reattachInstance() {

    if (figma.currentPage.selection.length === 0) {
        return "Select frames you want to replace with instances";
    }

    let skippedCount = 0;
    let processedCount = 0;
    let originalInstances = {}; // cache found instances
    
    const clonedSelection = Object.assign([], figma.currentPage.selection);

    for (let index in clonedSelection) {

        if (clonedSelection[index].type !== "FRAME") {
            skippedCount += 1;
            continue;
        }

        const frame = clonedSelection[index] as FrameNode;
        
        let componentReference: MasterOrInstance = null;
        if (!(frame.name in originalInstances)) {
            // Try to find an instance or master for the frame
            componentReference = figma.currentPage.findOne(node => isEquivalentNode(frame, node)) as MasterOrInstance;
            originalInstances[frame.name] = componentReference;
        } else {
            componentReference = originalInstances[frame.name];
        }

        // If instance was found, replace frame with it
        if (componentReference !== null) {
            let instanceClone: InstanceNode;
            if (componentReference.type === "INSTANCE") {
                instanceClone = componentReference.masterComponent.createInstance();
            } else {
                instanceClone = componentReference.createInstance();
            }
            // Insert instance right above the frame
            let frameIndex = frame.parent.children.indexOf(frame);
            frame.parent.insertChild(frameIndex + 1, instanceClone);
            // Position and resize new instance to frame
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

// Check if node is a component that can replace an instance
function isEquivalentNode(frame: FrameNode, node: BaseNode): node is MasterOrInstance {
    if (node.type !== "INSTANCE" && node.type !== "COMPONENT") return false;
    if (node.name !== frame.name) return false;
    return true;
}

figma.closePlugin(reattachInstance());
