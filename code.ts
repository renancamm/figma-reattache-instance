/**
 * According to Figma API docs overrides support:
 * - colours;
 * - text styles;
 * - and effects.
 *
 * @see https://help.figma.com/article/306-using-instances#override
 */

const effectsProps = ['effectStyleId', 'effects'];
const colorProps = [
    'backgroundStyleId',
    'backgrounds',
    'opacity',
    'fills',
    'strokes',
    'strokeWeight',
    'strokeAlign',
    'strokeCap',
    'strokeJoin',
    'dashPattern',
    'fillStyleId',
    'strokeStyleId',
];
const textStyleProps = [
    'fillStyleId',
    'fills',
    'textAlignHorizontal',
    'textAlignVertical',
    'textAutoResize',
    'paragraphIndent',
    'paragraphSpacing',
    'textStyleId',
    'fontSize',
    'fontName',
    'textCase',
    'textDecoration',
    'letterSpacing',
    'lineHeight',
];


function clone(val) {
    return JSON.parse(JSON.stringify(val));
}

function cloneProps(fromNode, toNode, propsList) {
    propsList.forEach(prop => {
        if (!fromNode[prop]) return;
        toNode[prop] = clone(fromNode[prop]);
    });
}


function extractFontName(node) {
    const fontsList = [];

    if (node.type === 'TEXT') {
        fontsList.push(node.fontName);
    }

    if (node.children && node.children.length) {
        node.children.forEach(child => {
            fontsList.push(...extractFontName(child));
        });
    }

    return fontsList;
}

function loadFonts(node) {
    return Promise.all(extractFontName(node).map(fontName => {
        return figma.loadFontAsync(fontName);
    }));
}

function applyOverrides(frame, instance) {
    cloneProps(frame, instance, effectsProps);
    cloneProps(frame, instance, colorProps);

    if (instance.type === 'TEXT' && frame.type === 'TEXT') {
        return cloneProps(frame, instance, textStyleProps);
    }

    if (!frame.children.length) {
        return;
    }

    frame.children.forEach((frameChild, index) => {
        const instanceChild = instance.children[index];
        applyOverrides(frameChild, instanceChild);
    });
}


async function reattachInstance() {
    let skippedCount = 0;
    let processedCount = 0;
    let originalInstances = {};

    if (figma.currentPage.selection.length == 0) {
        return "Please, select a frame first";
    }

    const clonedSelection = Object.assign([], figma.currentPage.selection);

    for (let index in clonedSelection) {
        let frame = clonedSelection[index];
        let instanceReference;

        if (frame.type !== "FRAME") {
          skippedCount += 1;
          continue
        }

        if (!(frame.name in originalInstances)) {
            instanceReference= figma.currentPage.findOne(node => node.type === "INSTANCE" && node.name == frame.name) as InstanceNode;
            originalInstances[frame.name] = instanceReference;
        } else {
            instanceReference = originalInstances[frame.name];
        }

        if (instanceReference != null) {
            let instanceClone = instanceReference.masterComponent.createInstance();
            frame.parent.appendChild(instanceClone);
            instanceClone.x = frame.x;
            instanceClone.y = frame.y;
            instanceClone.resize(frame.width, frame.height);

            // need to load fonts first, otherwise it won't apply font styles
            await loadFonts(frame);
            await loadFonts(instanceClone);
            applyOverrides(frame, instanceClone);

            frame.remove();
            processedCount += 1;
            continue;
        }
        skippedCount += 1;
        continue;
    }

    return `${processedCount} processed, ${skippedCount} skipped`;
}

(async () => {
    figma.closePlugin(await reattachInstance());
})()
