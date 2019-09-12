/**
 * According to Figma API docs overrides support:
 * - colours;
 * - text styles;
 * - and effects.
 *
 * @see https://help.figma.com/article/306-using-instances#override
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const textContentsProps = ['characters'];
const fontStyleProps = [
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
function hasChildren(node) {
    return !!node && !!node.children && !!node.children.length;
}
function clone(val) {
    return JSON.parse(JSON.stringify(val));
}
function cloneProps(fromNode, toNode, propsList) {
    propsList.forEach(prop => {
        if (!fromNode[prop])
            return;
        toNode[prop] = clone(fromNode[prop]);
    });
}
function extractFontName(node) {
    const fontsList = [];
    if (node.type === 'TEXT') {
        fontsList.push(node.fontName);
    }
    if (hasChildren(node)) {
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
function copyOverrides(frame, instance) {
    cloneProps(frame, instance, effectsProps);
    cloneProps(frame, instance, colorProps);
    if (instance.type === 'TEXT' && frame.type === 'TEXT') {
        cloneProps(frame, instance, fontStyleProps);
        cloneProps(frame, instance, textContentsProps);
        return;
    }
    if (!hasChildren(frame) || !hasChildren(instance)) {
        return;
    }
    frame.children.forEach((frameChild, index) => {
        const instanceChild = instance.children[index];
        copyOverrides(frameChild, instanceChild);
    });
}
function reattachInstance() {
    return __awaiter(this, void 0, void 0, function* () {
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
                continue;
            }
            if (!(frame.name in originalInstances)) {
                instanceReference = figma.currentPage.findOne(node => node.type === "INSTANCE" && node.name == frame.name);
                originalInstances[frame.name] = instanceReference;
            }
            else {
                instanceReference = originalInstances[frame.name];
            }
            if (instanceReference != null) {
                let instanceClone = instanceReference.masterComponent.createInstance();
                frame.parent.appendChild(instanceClone);
                instanceClone.x = frame.x;
                instanceClone.y = frame.y;
                instanceClone.resize(frame.width, frame.height);
                // need to load fonts first, otherwise it won't apply font styles
                yield loadFonts(frame);
                yield loadFonts(instanceClone);
                copyOverrides(frame, instanceClone);
                frame.remove();
                processedCount += 1;
                continue;
            }
            skippedCount += 1;
            continue;
        }
        return `${processedCount} processed, ${skippedCount} skipped`;
    });
}
(() => __awaiter(this, void 0, void 0, function* () {
    figma.closePlugin(yield reattachInstance());
}))();
