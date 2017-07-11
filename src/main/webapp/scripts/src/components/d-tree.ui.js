/**
 * @author lq
 * @description d-tree插件
 */
import $ from 'jquery';
import { SharkUI } from '../common/core';
import { BaseComponent } from '../common/base';

// 得到两棵数据树的差异
function diff(oldTopNode, newTopNode) {
    var index = 0;
    var patches = {};
    // 比较新老根元素节点
    compareNode(oldTopNode, newTopNode, index, patches);
    return patches;
}

// 对比两个相同位置的节点之间的差异
function compareNode(oldNode, newNode, index, patches) {
    var currentPatch = [];
    if (newNode) {
        var propsPatches = diffProps(oldNode, newNode);
        if (propsPatches) {
            currentPatch.push({ type: "PROPS", props: propsPatches });
        }
        compareChildren(
            oldNode.children || [],
            newNode.children || [],
            index,
            patches,
            currentPatch
        );
    }
    if (currentPatch.length) {
        patches[index] = currentPatch;
    }
}

// 将数组转成 key : index 形式的字符串
function changeArrToKeyIndex(list) {
    var keyIndex = {};
    list.forEach(function (item, i) {
        var itemKey = item.node_id;
        keyIndex[itemKey] = i;
    });
    return keyIndex;
}

// 数组对比
function listDiff(oldList, newList) {
    var oldKeyIndex = changeArrToKeyIndex(oldList);
    var newKeyIndex = changeArrToKeyIndex(newList);
    var moves = [];
    var children = [];
    // 首先新老对比,检查相对于新集,老集是否有元素被删除
    oldList.forEach(function (item) {
        var itemKey = item.node_id;
        if (!newKeyIndex.hasOwnProperty(itemKey)) {
            children.push(null);
        } else {
            var newItemIndex = newKeyIndex[itemKey];
            children.push(newList[newItemIndex]);
        }
    });
    // 临时数组
    var tempList = children.slice(0);
    for (var i = 0; i < tempList.length; i++) {
        if (tempList[i] === null) {
            remove(i);
            tempList.splice(i, 1);
            i--;
        }
    }
    var j = 0;
    newList.forEach(function (item, i) {
        var itemKey = item.node_id;
        var tempItem = tempList[j];
        var tempItemKey = tempItem && tempItem.node_id;
        if (tempItem) {
            if (itemKey === tempItemKey) {
                j++;
            } else {
                if (!oldKeyIndex.hasOwnProperty(itemKey)) {
                    insert(i, item);
                } else {
                    var nextItemKey = tempList[j + 1].node_id;
                    if (nextItemKey === itemKey) {
                        remove(i);
                        tempList.splice(j, 1);
                        j++;
                    } else {
                        insert(i, item);
                    }
                }
            }
        } else {
            insert(i, item);
        }
    });
    function remove(index) {
        var move = { index: index, type: 0 };
        moves.push(move);
    }
    function insert(index, item) {
        var move = { index: index, item: item, type: 1 };
        moves.push(move);
    }
    return {
        moves: moves,
        children: children
    };
}

// 对比同一父节点下子节点的差异
function compareChildren(oldChildren, newChildren, index, patches, currentPatch) {
    var diffs = listDiff(oldChildren, newChildren);
    newChildren = diffs.children;
    if (diffs.moves.length) {
        var reorderPatch = { type: "REORDER", moves: diffs.moves };
        currentPatch.push(reorderPatch);
    }
    var leftNode = null;
    var currentNodeIndex = index;
    oldChildren && oldChildren.forEach(function (child, i) {
        var newChild = newChildren[i];
        currentNodeIndex = (leftNode && leftNode.count) ? currentNodeIndex + leftNode.count + 1 : currentNodeIndex + 1;
        compareNode(child, newChild, currentNodeIndex, patches);
        leftNode = child;
    });
}

function diffProps(oldNode, newNode) {
    var count = 0;
    var propsPatches = {};
    if (oldNode && newNode) {
        if (oldNode.node_name !== newNode.node_name) {
            count++;
            propsPatches.node_name = newNode.node_name;
        }
        if (oldNode.state !== newNode.state) {
            count++;
            propsPatches.state = newNode.state;
        }
        if (oldNode.open !== newNode.open) {
            count++;
            propsPatches.open = newNode.open;
        }
    }
    if (count === 0) {
        return null;
    }
    return propsPatches;
}

function patchs(node, walker, patches) {
    var currentPatches = patches[walker.index];
    var aLi = node.children('ul').children('li');
    for (var i = 0; i < aLi.length; i++) {
        walker.index++;
        patchs($(aLi[i]), walker, patches);
    }
    if (currentPatches) {
        applyPatches(node, currentPatches);
    }
}

function applyPatches(node, currentPatches) {
    for (var i = 0; i < currentPatches.length; i++) {
        var currentPatch = currentPatches[i];
        switch (currentPatch.type) {
            case "REORDER":
                reOrderChildren(node, currentPatch.moves);
                break;
            case "PROPS":
                setProps(node, currentPatch.props);
                break;
        }
    }
}

function changeS(oA, state) {
    oA.removeClass();
    oA.addClass('tree-icon');
    switch (state) {
        case 0:
            oA.addClass('tree-icon-check-empty');
            break;
        case 1:
            oA.addClass('tree-icon-check-minus');
            break;
        case 2:
            oA.addClass('tree-icon-check');
            break;
        default:
            oA.addClass('tree-icon-check-empty');
    }
}

function changeOpenDom(node, open) {
    var oI = node.children('i');
    var oUl = node.children('ul');
    oI.removeClass();
    oUl.removeClass();
    oI.addClass('tree-icon');
    if (open) {
        oI.addClass('tree-icon-down');
        oUl.addClass('tree-open');
    } else {
        oI.addClass('tree-icon-right');
    }
}

function setProps(node, props) {
    var oSpan = node.children('span');
    var oA = node.children('a');
    if (oA.length) {
        for (var key in props) {
            switch (key) {
                case "node_name":
                    oSpan.text(props[key]);
                    break;
                case "state":
                    changeS(oA, props[key]);
                    break;
                case "open":
                    changeOpenDom(node, props[key]);
                    break;
            }
        }
    }
}

// 重新排序子节点
function reOrderChildren(node, moves) {
    for (var i = 0; i < moves.length; i++) {
        var ul = $(node).children('ul');
        var staticNodeList = $(node).children('ul').children('li');
        var move = moves[i];
        var index = move.index;
        if (move.type === 0) {
            var li = staticNodeList.eq(index);
            li.remove();
        } else if (move.type === 1) {
            var item = move.item;
            var li = getNodeDom(item);
            if (index) {
                staticNodeList.eq(index - 1).after(li);
            } else {
                ul.prepend(li);
            }
        }
    }
}

// 根据子节点的选中情况，得到node的选中状态
function getNodeState(node) {
    var children = node.children;
    if (children) {
        var count = 0;
        var len = children.length;
        for (var i = 0; i < len; i++) {
            var child = children[i];
            if (child.state === 1) {
                count = 'minus';
                break;
            }
            if (child.checked) {
                count++;
            }
        }
        switch (count) {
            case 0:
                node.state = 0;
                break;
            case len:
                node.state = 2;
                break;
            default:
                node.state = 1;
        }
    } else {
        node.state = node.checked ? 2 : 0;
    }
}

// 处理节点，为每个节点加上count属性，父节点id和选中状态
function handleNode(node) {
    var children = node.children;
    node.count = 0;
    children && children.forEach(function (child) {
        handleNode(child);
        child.parentId = node.node_id;
        node.count += child.count + 1;
    });
    // 根据子节点的选中情况，得到node的选中状态
    getNodeState(node);
}

// 获取数据根节点
function getTopNode(nodes) {
    var topNode = { children: nodes };
    // 处理节点，为每个节点加上count属性和父节点id
    handleNode(topNode);
    return topNode;
}

// 获取node的dom节点
function getNodeDom(node) {
    var children = node.children;
    var open = !!node.open;
    var oI = null;
    if (children) {
        oI = $('<i class="tree-icon"></i>');
        open ? oI.addClass('tree-icon-down') : oI.addClass('tree-icon-right');
    }
    var oA = $('<a class="tree-icon"></a>');
    switch (node.state) {
        case 0:
            oA.addClass('tree-icon-check-empty');
            break;
        case 1:
            oA.addClass('tree-icon-check-minus');
            break;
        case 2:
            oA.addClass('tree-icon-check');
            break;
        default:
            oA.addClass('tree-icon-check-empty');
    }
    var oSpan = $('<span class="tree-node-name"></span>');
    oSpan.html(node.node_name);
    var oLi = $('<li></li>');
    oLi.data('id', node.node_id);
    oLi.append(oI);
    oLi.append(oA);
    oLi.append(oSpan);
    if (children) {
        var oUl = getUlDom(children, open);
        oLi.append(oUl);
    }
    return oLi;
}

// 获取ul的dom节点
function getUlDom(nodes, open) {
    var oUl = $('<ul></ul>');
    open && oUl.addClass('tree-open');
    nodes.forEach(function (node) {
        var oLi = getNodeDom(node);
        oUl.append(oLi);
    });
    return oUl;
}

// 根据根数据根节点，初始化树组件的dom结构
function initDom(sharkComponent, targetElement) {
    var component = $('<div class="shark-d-tree shark-tree"></div>');
    var children = sharkComponent.topNode.children;
    if (children) {
        var oUl = getUlDom(children);
        component.append(oUl);
    }
    if (targetElement) {
        targetElement.append(component);
    }
    sharkComponent.component = component;
}

// 修改子集的选中状态
function changeChildren(children, checked) {
    children.forEach(function (child) {
        child.checked = checked;
        child.state = checked ? 2 : 0;
        var iChildren = child.children;
        iChildren && changeChildren(iChildren, checked);
    });
}

// 修改父集的选中状态
function changeParent(newTopNode, node, id) {
    var children = node.children || [];
    if (node.node_id === id) {
        var checked = true;
        var len = children.length;
        var count = 0;
        for (var i = 0; i < len; i++) {
            // 只要有一个是false，就是false
            if (!children[i].checked) {
                checked = false;
            } else {
                count++;
            }
            if (children[i].state === 1) {
                checked = false;
                count = 'minus';
                break;
            }
        }
        switch (count) {
            case 0:
                node.state = 0;
                break;
            case len:
                node.state = 2;
                break;
            default:
                node.state = 1;
        }
        node.checked = checked;
        // 检查是否还存在父级
        node.parentId && changeParent(newTopNode, newTopNode, node.parentId);
        return node;
    } else {
        for (var i = 0; i < children.length; i++) {
            var node = changeParent(newTopNode, children[i], id);
            if (node) {
                return node;
            }
        }
    }
}

// 修改数据树的选中状态
function changeChecked(newTopNode, node, id) {
    var children = node.children || [];
    if (node.node_id === id) {
        // 切换节点checked状态
        node.checked = !node.checked;
        node.state = node.checked ? 2 : 0;
        // 子集的checked属性与父级保持一致
        changeChildren(children, node.checked);
        changeParent(newTopNode, newTopNode, node.parentId);
        return node;
    } else {
        for (var i = 0; i < children.length; i++) {
            var node = changeChecked(newTopNode, children[i], id);
            // 如果node存在，没有必要再循环下去，直接返回
            if (node) {
                return node;
            }
        }
    }
}

// 修改数据树的选中状态
function changeOpen(node, id) {
    var children = node.children || [];
    if (node.node_id === id) {
        // 切换节点checked状态
        node.open = !node.open;
        return node;
    } else {
        for (var i = 0; i < children.length; i++) {
            var node = changeOpen(children[i], id);
            // 如果node存在，没有必要再循环下去，直接返回
            if (node) {
                return node;
            }
        }
    }
}

// 初始化事件
function initEvents(sharkComponent) {
    var component = sharkComponent.component;
    component.on('click', 'li', function (e) {
        var li = $(e.currentTarget);
        var id = li.data('id');
        var newTopNode = {};
        SharkUI.extend(newTopNode, sharkComponent.topNode);
        // 修改新的数据树的选中状态
        changeChecked(newTopNode, newTopNode, id);
        // 得到两棵数据树的差异
        var patches = diff(sharkComponent.topNode, newTopNode);
        patchs(component, { index: 0 }, patches);
        sharkComponent.topNode = newTopNode;
        // 阻止冒泡
        e.stopPropagation();
    });

    component.on('click', 'i', function (e) {
        var li = $(e.currentTarget).parent('li');
        var id = li.data('id');
        var newTopNode = {};
        SharkUI.extend(newTopNode, sharkComponent.topNode);
        // 修改展开收起的状态
        changeOpen(newTopNode, id);
        // 得到两棵数据树的差异
        var patches = diff(sharkComponent.topNode, newTopNode);
        patchs(component, { index: 0 }, patches);
        sharkComponent.topNode = newTopNode;
        // 阻止冒泡
        e.stopPropagation();
    });
}

// 重新render
function render(sharkComponent, newTreeData) {
    var topNode = getTopNode(newTreeData);
    var patches = diff(sharkComponent.topNode, topNode);
    patchs(sharkComponent.component, { index: 0 }, patches);
    sharkComponent.topNode = topNode;
}

SharkUI.sharkDTree = function (options, targetElement) {
    var config = {
        nodes: []
    };
    SharkUI.extend(config, options);
    // 组件对象
    var sharkComponent = {};
    // 获取数据根节点
    sharkComponent.topNode = getTopNode(config.nodes);
    // 初始化dom节点
    initDom(sharkComponent, targetElement);
    // 添加基础方法
    BaseComponent.addComponentBaseFn(sharkComponent, config);
    // 初始化事件
    initEvents(sharkComponent);
    // 在组件对象上添加render方法
    sharkComponent.render = function (nodes) {
        render(sharkComponent, nodes);
    };
    return sharkComponent;
}
