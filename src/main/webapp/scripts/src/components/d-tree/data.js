// 修改数据树的选中状态
function changeChecked(checkable, newTopNode, node, id, link) {
    if (checkable) {
        var node = getNodeById(newTopNode, id);
        if (node) {
            // 切换节点checked状态
            node.checked = !node.checked;
            node.state = node.checked ? 2 : 0;
            if (link) {
                // 子集的checked属性与父级保持一致
                checkChildren(node);
                checkParent(newTopNode, node.parentId);
            }
        }
        return node;
    }
}

// 全选/全不选
function checkAll(topNode, flag) {
    // 修改顶层树节点的状态
    topNode.checked = flag;
    // 子节点的状态由父节点决定
    checkChildren(topNode);
}

// 修改子集的选中状态
function checkChildren(node) {
    var children = node.children || [];
    var checked = node.checked;
    children.forEach(function (child) {
        child.checked = checked;
        child.state = checked ? 2 : 0;
        checkChildren(child);
    });
}

// 通过id查找节点，并修改节点属性
function changeNodeAttrById(newTopNode, id, attrName, attrVal) {
    var node = getNodeById(newTopNode, id);
    if (node) {
        node[attrName] = attrVal;
    }
    return node;
}

// 修改数据树的展开和收起
function changeOpen(newTopNode, id) {
    var node = getNodeById(newTopNode, id);
    node.open = !node.open;
    return node;
}

// 修改父集的选中状态
function checkParent(newTopNode, id) {
    var node = getNodeById(newTopNode, id);
    if (node) {
        setCheckState(node, true);
        node.parentId && checkParent(newTopNode, node.parentId);
    }
}

// 通过id查找节点
function getNodeById(node, id) {
    var children = node.children || [];
    if (node.id === id) {
        return node;
    } else {
        for (var i = 0; i < children.length; i++) {
            var node = getNodeById(children[i], id);
            if (node) {
                return node;
            }
        }
    }
}

// 根据某种状态获取节点id列表
function getNodeList(nodeTree, key, nodeList) {
    var children = nodeTree.children || [];
    nodeList = nodeList || [];
    children.forEach(function (childTree) {
        getNodeList(childTree, key, nodeList);
    });
    if (nodeTree.id && nodeTree[key]) {
        nodeList.push(nodeTree);
    }
    return nodeList;
}

// 获取数据根节点
function getTopNode(treeData, config) {
    var topNode = { children: treeData };
    // 处理节点，为每个节点加上count属性，父id和当前选中状态
    handleNode(topNode, config);
    return topNode;
}

// 处理节点，为每个节点加上count属性，父节点id和选中状态 | (做递归处理)
function handleNode(node, config) {
    var children = node.children;
    node.count = 0;
    children && children.forEach(function (child) {
        handleNode(child, config);
        // 将父id存在节点上,方便查找
        child.parentId = node.id;
        // 统计子节点数量
        node.count += child.count + 1;
    });
    if (config.checkable) {
        // 设置node的选中状态(选中/未选中/半选中)
        setCheckState(node, config.link);
    }
}

// 全部展开（递归展开）
function openAll(node) {
    var children = node.children;
    if (children) {
        node.open = true;
        children.forEach(function (child) {
            openAll(child);
        });
    }
}

// 打开某几个节点
function openTo(newTopNode, idList) {
    idList.forEach(function (id) {
        changeNodeAttrById(newTopNode, id, 'open', true);
    });
}

// 反选
function reverseCheck(newTopNode, node) {
    var children = node.children || [];
    children.forEach(function (child) {
        if (!child.children) {
            child.checked = !child.checked;
            child.state = child.checked ? 2 : 0;
        } else {
            reverseCheck(newTopNode, child);
        }
    });
    checkParent(newTopNode, node.id);
}

// 将所有节点的selected设为false
function selectNo(node) {
    var children = node.children || [];
    node.selected = false;
    children.forEach(function (child) {
        selectNo(child);
    });
}

// 修改数据节点的选中
function selectNode(topNode, id, config) {
    if (config.selectable) {
        if (!config.multiple) {
            selectNo(topNode);
        }
        return changeNodeAttrById(topNode, id, 'selected', true);
    }
}

// 设置选中项
function setChecked(newTopNode, idList, flag, config) {
    idList.forEach(function (id) {
        changeNodeAttrById(newTopNode, id, 'checked', flag);
    });
    handleNode(newTopNode, config);
}

// 设置选中状态
function setCheckState(parent, link) {
    var children = parent.children;
    if (children && link) {
        // 子节点的数量
        var len = children.length;
        // 子节点的选中数量
        var checkedCount = 0;
        for (var i = 0; i < len; i++) {
            var state = children[i].state;
            // 如果存在子节点处于半选状态，则父节点一定是半选状态，退出循环
            if (state === 1) {
                checkedCount = 'half';
                break;
            } else if (state === 2) {
                checkedCount++;
            }
        }
        switch (checkedCount) {
            case 0:
                parent.state = 0;
                break;
            case len:
                parent.state = 2;
                break;
            default:
                parent.state = 1;
        }
        parent.checked = (parent.state === 2 ? true : false);
    } else {
        parent.state = parent.checked ? 2 : 0;
    }
}

// 设置选中项
function setSelected(topNode, idList, multiple) {
    // 单选
    if (!multiple) {
        selectNo(topNode);
        if (idList.length) {
            idList = idList.slice(0, 1);
        }
    }
    idList.forEach(function (id) {
        changeNodeAttrById(topNode, id, 'selected', true);
    });
}

var TreeData = {
    changeChecked: changeChecked,
    changeOpen: changeOpen,
    checkAll: checkAll,
    getNodeList: getNodeList,
    getTopNode: getTopNode,
    openAll: openAll,
    openTo: openTo,
    reverseCheck: reverseCheck,
    selectNode: selectNode,
    setChecked: setChecked,
    setSelected: setSelected
};
export { TreeData };
