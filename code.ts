type MasterOrInstance = InstanceNode | ComponentNode;

async function main() {

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
            componentReference = figma.root.findOne(node => isEquivalentNode(frame, node)) as MasterOrInstance;
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
            await overrideProperties(frame, instanceClone);
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


// Recursively overrides all properties on an instance
async function overrideProperties(source: SceneNode, target: SceneNode) {


    // If source is text, the long and tedious process 
    // of replacing all text properties begins!
    if (source.type === "TEXT" && target.type === "TEXT") {
        await overrideTextProperties(source, target);
    }

    // Try to override every other property
    // if it's present in source and not mixed
    allProperties.forEach(prop => {
        if (!(prop in source)) return;
        if (source[prop] === undefined) return;
        if (areEquivalent(target[prop], source[prop]) || isMixed(source[prop])) return;

        try {
            target[prop] = source[prop];
        } catch (e) { console.error(e); }
    });

    // Instances can be overriden too
    if (source.type === "INSTANCE" && target.type === "INSTANCE") {
        if (target.masterComponent.id !== source.masterComponent.id) {
            target.masterComponent = source.masterComponent;
        }
    }

    // Recursively change all children
    if (supportsChildren(source) && supportsChildren(target)) {
        for (let i = 0; i < target.children.length; i++) {
            const sourceChild = source.children[i] as SceneNode;
            const targetChild = target.children[i] as SceneNode;
            if (!sourceChild || !targetChild) continue;
            await overrideProperties(sourceChild, targetChild);
        }
    }

}

// Override all properties of text layers
// Mixed properties are applied on each character because there are no alternatives
async function overrideTextProperties(source: TextNode, target: TextNode) {

    // Collect mixed properties to replace them later
    const mixedProperties: string[] = [];
    const isStringSame = target.characters === source.characters;

    // Hacky methods to get character setter/getter methods 
    // from property names
    const getPropertyAtChar = (prop: string, char: number) => {
        const rangeMethod = "getRange" + prop[0].toUpperCase() + prop.slice(1);
        return source[rangeMethod](char, char + 1);
    }

    const setPropertyAtChar = (prop: string, char: number, value: any) => {
        const rangeMethod = "setRange" + prop[0].toUpperCase() + prop.slice(1);
        target[rangeMethod](char, char + 1, value);
    }

    // Start off by checking if characters are the same and changing them
    const fontName = source.getRangeFontName(0, 1) as FontName;

    await figma.loadFontAsync(fontName).then(() => {
        // With font loaded we reset all properties to 
        // ones applied to the first character of source
        textProperties.forEach(prop => {
            if (isMixed(source[prop])) {
                mixedProperties.push(prop);
            }
            if (isStringSame) return;
            const value = getPropertyAtChar(prop, 0);
            if (areEquivalent(target[prop], value)
                && value !== undefined) return;
            target[prop] = value;
        });

        if (!isStringSame) {
            target.characters = source.characters;
        }
    }).catch((e) => { console.error(e); });

    // All properties are set on the whole text without mixed ones!
    if (mixedProperties.length === 0) {
        return;
    }

    // Don't override too long texts with many different properties
    // because it would take too much time
    if (target.characters.length > 150
        && mixedProperties.length > 2) {
        return;
    }

    // Load all fonts on the text block
    for (let char = 0; char < target.characters.length; char++) {
        const fontName = source.getRangeFontName(char, char + 1) as FontName
        await figma.loadFontAsync(fontName).catch((e) => { console.error(e); });
    }

    // Set properties character by character on mixed fields
    // This can't be done in the previous loop
    for (let char = 0; char < target.characters.length; char++) {
        for (let i = 0; i < mixedProperties.length; i++) {
            const prop = mixedProperties[i];
            try {
                const value = getPropertyAtChar(prop, char);
                if (value === null) continue;
                setPropertyAtChar(prop, char, value);
            } catch (e) { console.error(e); }
        }
    }
}

// Returns type predicate and true if node supports children
function supportsChildren(node: SceneNode):
    node is FrameNode | ComponentNode | InstanceNode | BooleanOperationNode {
    return node.type === "FRAME" || node.type === "COMPONENT" ||
        node.type === "INSTANCE" || node.type === "BOOLEAN_OPERATION";
}

function isMixed(property: any) {
    return property === figma.mixed && typeof property === "symbol";
}

// Checks if two objects are equivalent
function areEquivalent(a: any, b: any) {
    if (a === b) {
        return true;
    }
    if (!(a instanceof Object || b instanceof Object)) {
        return false;
    }

    if (toType(a) !== toType(b)) {
        return false;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }
        if (a.length === b.length) {
            for (let i = 0; i < a.length; i++) {
                if (!areEquivalent(a[i], b[i])) {
                    return false;
                }
            }
        }
        return true;
    }

    // Create arrays of property names
    let aProps = Object.getOwnPropertyNames(a);
    let bProps = Object.getOwnPropertyNames(b);

    // If number of properties is different,
    // objects are not equivalent
    if (aProps.length !== bProps.length) {
        return false;
    }
    for (let i = 0; i < aProps.length; i++) {
        let prop = aProps[i];
        // Recursion: if values of the same property
        // are not equal, objects are not equivalent
        if (!areEquivalent(a[prop], b[prop])) {
            return false;
        }
    }
    // If we made it this far, objects
    // are considered equivalent
    return true;
}

// Returns type of an object
function toType(obj: any) {
    return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
}

// A list of all overrrideable properties in Figma
const allProperties = [
    "visible",
    "locked",
    "opacity",
    "blendMode",

    "effects",
    "effectStyleId",
    // frame
    "backgrounds",
    "layoutGrids",
    "clipsContent",
    "guides", // array
    "gridStyleId",
    "backgroundStyleId",
    // geometry
    "fills", // array
    "strokes", // array
    "strokes",
    "strokeAlign",
    "strokeCap",
    "strokeJoin",
    "dashPattern",
    "fillStyleId",
    "strokeStyleId",

    "cornerRadius",
    "cornerSmoothing",

    "exportSettings", // array
    // component instance
    "masterComponent", // check its id
    // text
    "autoRename",
    "textAlignHorizontal",
    "textAlignVertical",
    "paragraphIndent",
    "paragraphSpacing",
];

// Text properties that can be overriden on individual characters
const textProperties = [
    "fills",
    "fillStyleId",
    
    "fontSize",
    "fontName",
    "textCase",
    "textDecoration",
    "letterSpacing",
    "lineHeight",
    "textStyleId",
];

// Methods are async, close plugin when they are resolved
main().then(msg => {
    figma.closePlugin(msg);
});
