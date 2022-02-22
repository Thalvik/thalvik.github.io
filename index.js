class DragJS {
    //Default values
    #dragItemClass = 'item';
    #draggableClass = 'draggable';
    #lockedClass = 'locked';
    #overClass = 'over';
    #inputOrder = 'drop-article-order';
    #lockedCheckboxSelector = 'lock-element';
    #elementsToSwitch = [];
    #checkSameClasses = [];
    dragSrcEl = {};

    /**
     * A class constructor. Set parameters and init the class methods
     * @param params
     */
    constructor(params) {
        //Init on dom ready
        let instance = this;
        document.addEventListener('DOMContentLoaded', function() {
            instance.setParams(params);
            instance.init();
        });
    }

    /**
     * Set parameters. Use default values if not set in object
     * @param params
     */
    setParams(params) {
        if (params !== undefined) {
            this.#dragItemClass = 'dragItemClass' in params ? params.dragItemClass : this.#dragItemClass;
            this.#draggableClass = 'draggableClass' in params ? params.draggableClass : this.#draggableClass;
            this.#lockedClass = 'lockedClass' in params ? params.lockedClass : this.#lockedClass;
            this.#overClass = 'overClass' in params ? params.overClass : this.#overClass;
            this.#inputOrder = 'inputOrder' in params ? params.inputOrder : this.#inputOrder;
            this.#lockedCheckboxSelector = 'lockedCheckboxSelector' in params ? params.lockedCheckboxSelector : this.#lockedCheckboxSelector;
            this.#elementsToSwitch = 'elementsToSwitch' in params ? params.elementsToSwitch : this.#elementsToSwitch;
            this.#checkSameClasses = 'checkSameClasses' in params ? params.checkSameClasses : this.#checkSameClasses;
        }
    };

    /**
     * Main init function
     */
    init () {
        //Assign events to checkboxes
        this.addEvent();

        //Also update total number of checked ones, once the scripts first execute
        let checkboxes = document.querySelectorAll('input.' + this.#lockedCheckboxSelector);
        for (let i = 0; i < checkboxes.length; i++) {
            if (checkboxes[i].checked) {
                this.handleCheckBoxes(checkboxes[i]);
            }
        }

        //Get all elements
        let els = document.getElementsByClassName(this.#dragItemClass);
        let instance = this;

        //For each element assign drag events
        Array.prototype.forEach.call(els, function (e) {
            e.draggable = true;

            //Begin of drag process
            e.ondragstart = function(e) {
                //Do not drag if it does not have draggable class set
                if (!this.classList.contains(instance.#draggableClass)) {
                    e.preventDefault();
                }

                //Do not drag if its locked
                if (this.classList.contains(instance.#lockedClass)) {
                    e.preventDefault();
                }

                instance.dragSrcEl = this;

                //Which drop effect to use. Default is move
                e.dataTransfer.effectAllowed = 'move';

                //Get dataset for id
                let id = this.dataset.id;
                let obj = {
                    'id' : id
                };

                //For each element inside elementsToSwitch object, create an object of their values
                Array.prototype.forEach.call(instance.#elementsToSwitch, function (element) {
                    let searchElement = instance.dragSrcEl.getElementsByTagName(element);
                    if (searchElement.length > 0) {
                        obj[element] = searchElement[0].outerHTML;
                    }
                });

                //Send them with dataTransfer as JSON object
                e.dataTransfer.setData('text/plain', JSON.stringify(obj));
            };

            //Add over class on drag enter
            e.ondragenter = function() {
                this.classList.add(instance.#overClass);
            };

            //On drag over, set drop effect
            e.ondragover = function(e) {
                if (e.preventDefault) {
                    e.preventDefault();
                }
                e.dataTransfer.dropEffect = 'move';
                return false;
            };

            //Remove over class on dragleave
            e.ondragleave = function() {
                this.classList.remove(instance.#overClass);
            };

            //On drag drop over target item
            e.ondrop = function(e) {
                if (e.stopPropagation) {
                    e.stopPropagation();
                }

                //If it's not itself
                if (instance.dragSrcEl !== this) {
                    //Do not drag over locked one
                    if (this.classList.contains(instance.#lockedClass)) {
                        e.stopPropagation();
                        return;
                    }

                    //Set over element
                    let overElement = this;

                    //If source and target does not have same class and checkSameClasses is defined, stop
                    if (instance.#checkSameClasses.length > 0) {
                        let dragClass = '';
                        let overClass = '';

                        //Compare classes between source and target
                        Array.prototype.forEach.call(instance.#checkSameClasses, function (element) {
                            if (instance.dragSrcEl.classList.contains(element)) {
                                dragClass = element;
                            }
                            if (overElement.classList.contains(element)) {
                                overClass = element;
                            }
                        });

                        if (dragClass !== overClass) {
                            e.stopPropagation();
                            return;
                        }
                    }

                    //Create an object from target to use for later
                    let id = this.dataset.id;
                    let obj = {
                        'id' : id,
                    }
                    Array.prototype.forEach.call(instance.#elementsToSwitch, function (element) {
                        let searchElement = overElement.getElementsByTagName(element);
                        if (searchElement.length > 0) {
                            obj[element] = searchElement[0].outerHTML;
                        }
                    });

                    //Get data from source one and set it in target
                    let jsonObj = JSON.parse(e.dataTransfer.getData('text'));
                    this.dataset.id = jsonObj.id;
                    Array.prototype.forEach.call(instance.#elementsToSwitch, function (element) {
                        let searchElement = overElement.getElementsByTagName(element);
                        if (searchElement.length > 0) {
                            overElement.getElementsByTagName(element)[0].outerHTML = jsonObj[element];
                        }
                    });

                    //From target one update source one
                    instance.dragSrcEl.dataset.id = obj.id;
                    Array.prototype.forEach.call(instance.#elementsToSwitch, function (element) {
                        let searchElement = instance.dragSrcEl.getElementsByTagName(element);
                        if (searchElement.length > 0) {
                            instance.dragSrcEl.getElementsByTagName(element)[0].outerHTML = obj[element];
                        }
                    });

                    //Update elements and add checkbox event's again after update
                    instance.updateSortElements();
                    instance.addEvent();
                }
            };

            //On drag end. Not used at the moment
            e.ondragend = function() {
            };
        });

        //Update sort elements regardless of whether elements exist or not
        this.updateSortElements();
    }

    /**
     * Updates final sort elements in hidden input field
     */
    updateSortElements(){
        //Get all elements
        let els = document.getElementsByClassName(this.#dragItemClass);
        let itemsLocked = [];
        let instance = this;

        //For each of them get id and if it's locked
        Array.prototype.forEach.call(els, function (item) {
            let id = item.dataset.id;
            item.classList.remove(instance.#overClass);
            let isLocked = item.classList.contains(instance.#lockedClass);
            itemsLocked.push({'id' : id, 'locked' : isLocked});
        });

        //Update hidden input field with JSON object
        let hiddenLockedOrderField = document.getElementById(this.#inputOrder);
        if (hiddenLockedOrderField !== null) {
            hiddenLockedOrderField.value = JSON.stringify(itemsLocked);
        }
    }

    /**
     * Call on checkbox checked or unchecked
     * @param currentTarget
     */
    handleCheckBoxes(currentTarget) {
        //Get all checkboxes
        let checkboxes = document.querySelectorAll('input.' + this.#lockedCheckboxSelector);

        //Set initial number of checked ones
        let checkedBoxes = 0;
        for (let i = 0; i < checkboxes.length; i++) {
            if (checkboxes[i].checked) {
                checkedBoxes++;
            }
        }

        //The target element is the parent-parent of checkbox
        let targetElement = currentTarget.parentElement.parentElement;
        if (targetElement.classList.contains(this.#dragItemClass)) {
            if (currentTarget.checked) { //Add locked class and remove draggable one. Decrease total number of checked checkboxes
                targetElement.classList.remove(this.#draggableClass);
                targetElement.classList.add(this.#lockedClass);
                checkedBoxes++;
            } else { //Add draggable class and remove locked one. Increase total number of checked checkboxes
                targetElement.classList.add(this.#draggableClass);
                targetElement.classList.remove(this.#lockedClass);
                checkedBoxes--;
            }
        }

        //Update elements
        this.updateSortElements();
    }

    /**
     * Assigns event listener to all checkboxes defined for locking
     */
    addEvent() {
        //Get all checkboxes
        let checkboxes = document.querySelectorAll('input.' + this.#lockedCheckboxSelector);

        //For each of them assign event listener
        for (let i = 0; i < checkboxes.length; i++) {
            checkboxes[i].addEventListener('change', (event) => {
                this.handleCheckBoxes(event.currentTarget);
            });
        }
    }
}
