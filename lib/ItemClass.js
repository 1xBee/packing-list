import utils from "./utils.js";
const { isNonEmptyString, isPositiveInt } = utils;

class Container {
  constructor(...e) {
    this.addItems(...e);
  }

  #itemList = new Set();

  addItems(...e) {
    e.forEach((e) => {
      if (e instanceof Item) {
        this.#itemList.add(e);
      } else {
        const item = new Item(e.collection, e.item_name, e.item_id, e.boxes);
        this.#itemList.add(item);
      }
    });
  }

  getItemsById(e) {
    if (isPositiveInt(e)) {
      return Array.from(this.#itemList.values()).filter(
        (el) => el.getItemData().item_id === e
      );
    } else {
      throw new Error(`invalid argument for Container.getItemsById '${e}'`);
    }
  }

  deleteItem(e) {
    if (e && e instanceof Item && this.#itemList.has(e)) {
      this.#itemList.delete(e);
    } else {
      throw new Error(`invalid argument for Container.deleteItem '${e}'`);
    }
  }

  getContainerData(e) {
    if (!isNonEmptyString(e))
      throw new Error(`invalid argument for Container.getContainerData '${e}'`);
    e = e.toLowerCase();

    if (e === "obj") {
      return this.#getDataAsObj();
    } else if (e === "json") {
      return this.#getDataAsJson();
    } else if (e === "table") {
      return this.#getDataAsTable();
    } else {
      return null;
    }
  }

  #getDataAsObj() {
    return Array.from(this.#itemList.values());
  }

  #getDataAsJson() {
    return Array.from(this.#itemList.values()).map((el) =>
      el.getItemData("json")
    );
  }

  #getDataAsTable() {
    return Array.from(this.#itemList.values())
      .map((el) => el.getItemData("table"))
      .flat();
  }
}

// Item class
// takes: collection as string, item_name as string, item_id as int, boxes as array of box_qty as int, and box_description as string.
class Item {
  constructor(collection, item_name, item_id, ...boxes) {
    const _ = this;
    _.collection = collection;
    _.item_name = item_name;
    _.item_id = item_id;
    _.addBoxes(...boxes);
  }

  // Privet feild's
  #collection;
  #item_name;
  #item_id;
  // Boxes - use Set for ease remove in the box instense with self refrence
  #boxes = new Set();

  // Collection setter - checks for string
  set collection(e) {
    if (isNonEmptyString(e)) {
      this.#collection = e.trim();
    } else {
      throw new Error(`invalid argument for collection '${e}'`);
    }
  }

  // Item name setter - checks for string,
  set item_name(e) {
    if (isNonEmptyString(e)) {
      this.#item_name = e.trim();
    } else {
      throw new Error(`invalid argument for item_name '${e}'`);
    }
  }

  // Item id setter - checks for positive int
  set item_id(e) {
    if (isPositiveInt(e)) {
      this.#item_id = e;
    } else {
      throw new Error(`invalid argument for item_id '${e}'`);
    }
  }

  // Boxes setter - create Box instnses for each obj in the pram, and write to the Boxes Map
  addBoxes(...e) {
    if (Array.isArray(e) && e.length > 0) {
      e.forEach((el) => {
        const box = new Box(el[0], el[1], this);
        this.#boxes.add(box);
      });
    } else {
      throw new Error(`invalid argument for boxes '${e}'`);
    }
  }

  // removeBox - will be called from the box it self
  // Makes sure to not leave a Item with 0 boxes
  removeBox(e) {
    if (e && e instanceof Box && this.#boxes.has(e)) {
      if (this.#boxes.size < 2)
        throw new Error(
          "can't delete box, error: item must have at least one box"
        );
      this.#boxes.delete(e);
    } else {
      throw new Error(`invalid argument for item.removeBox '${e}'`);
    }
  }

  // mathad getItemData - simple loging style data, convert boxes 'values' to array
  getItemData(e = "obj") {
    if (!isNonEmptyString(e))
      throw new Error(`invalid argument for item.getItemData '${e}'`);
    e = e.toLowerCase();
    return e === "obj"
      ? this.#getDataAsOBJ()
      : e === "json"
      ? this.#getDataAsJson()
      : e === "table"
      ? this.#getDataAsTable()
      : null;
  }

  #getDataAsOBJ() {
    return {
      collection: this.#collection,
      item_name: this.#item_name,
      item_id: this.#item_id,
      boxes: Array.from(this.#boxes.values()),
    };
  }

  #getDataAsJson() {
    return {
      collection: this.#collection,
      item_name: this.#item_name,
      item_id: this.#item_id,
      boxes: Array.from(this.#boxes.values()).map((v) => ({
        qty: v.qty,
        description: v.description,
      })),
    };
  }

  #getDataAsTable() {
    const tableData = Array.from(this.#boxes.values()).map((el) => {
      return {
        collection: this.#collection,
        item_name: this.#item_name,
        item_id: this.#item_id,
        box_qty: el.qty,
        box_description: el.description,
      };
    });
    return tableData;
  }

  // mathad getBoxesByName -
  getBoxesByName(e) {
    if (!isNonEmptyString(e))
      throw new Error(`invalid argument for item.getBoxesByName '${e}'`);
    const filterded = Array.from(this.#boxes.values()).filter(
      (v) => v.description === e.trim()
    );
    return filterded;
  }
}

class Box {
  constructor(qty, description, parentItem) {
    this.qty = qty;
    this.description = description;
    this.#setParentItem(parentItem);
  }

  #description;
  #qty;
  #parentItem;

  set description(e) {
    if (isNonEmptyString(e)) {
      this.#description = e;
    } else {
      throw new Error(`invalid argument for box.description '${e}'`);
    }
  }

  get description() {
    return this.#description;
  }

  set qty(e) {
    if (isPositiveInt(e)) {
      this.#qty = e;
    } else {
      throw new Error(`invalid argument for box.qty '${e}'`);
    }
  }

  get qty() {
    return this.#qty;
  }

  #setParentItem(e) {
    if (e instanceof Item) {
      this.#parentItem = e;
    } else {
      throw new Error(`invalid argument for box.parentItem'${e}'`);
    }
  }

  getParentItem() {
    return this.#parentItem;
  }

  remove() {
    this.#parentItem.removeBox(this);
  }
}

export { Container, Item, Box };
