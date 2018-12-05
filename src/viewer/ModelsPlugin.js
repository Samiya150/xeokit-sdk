import {_apply} from "../xeogl/xeogl.module.js"
import {Plugin} from "./Plugin.js";

/**
 Base class for Viewer plugins that load models.

 @class ModelsPlugin
 */
class ModelsPlugin extends Plugin {

    /**
     * @constructor
     *
     * @param {String} [id] ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {Viewer} viewer The Viewer.
     * @param {Class} modelClass The JavaScript class for the type of model this plugin will manage.
     * @param {Object} cfg  Plugin configuration.
     */
    constructor(id, viewer, modelClass, cfg) {

        super(id, viewer, cfg);

        /**
         * @private
         */
        this._modelClass = modelClass;

        /**
         * <a href="http://xeogl.org/docs/classes/Model.html">xeogl.Models</a> currently loaded by this Plugin.
         * @type {{String:Model}}
         */
        this.models = {};

        /**
         * Saves load params for bookmarks.
         * @private
         */
        this._modelLoadParams = {};
    }

    /**
     * Loads a model into this Plugin's {@link Viewer}.
     *
     * @param params {*} Loading params.
     * @param params.id {String} ID to assign to the model, unique among all components in the Viewer's xeogl.Scene.
     * @returns {{xeogl.Model}} A <a href="http://xeogl.org/docs/classes/Model.html">xeogl.Model</a> representing the loaded model
     */
    load(params, ok) {
        const id = params.id;
        if (!id) {
            this.error("load() param expected: id");
            return;
        }
        if (this.viewer.scene.components[id]) {
            this.error(`Component with this ID already exists in viewer: ${id}`);
            return;
        }
        const model = new this._modelClass(this.viewer.scene, params);
        this._modelLoadParams[id] = _apply(params, {});
        this.models[id] = model;
        model.once("destroyed", () => {
            delete this.models[id];
            delete this._modelLoadParams[id];
        });
        if (ok) {
            model.once("loaded", ok);
        }
        return model;
    }

    /**
     * Unloads and destroys a model that was previously loaded by this Plugin.
     *
     * @param {String} id  ID of model to unload.
     */
    unload(id) {
        const model = this.models;
        if (!model) {
            this.error(`unload() model with this ID not found: ${id}`);
            return;
        }
        model.destroy();
    }

    /**
     * @private
     */
    send(name, value) {
        switch (name) {
            case "clear":
                this.clear();
                break;
        }
    }

    /**
     * @private
     */
    writeBookmark(bookmark) {
        bookmark[this.id] = this._modelLoadParams;
    }

    /**
     * @private
     */
    readBookmarkAsynch(bookmark, ok) {
        this.clear();
        var modelLoadParams = bookmark[this.id];
        if (modelLoadParams) {
            var modelParamsList = [];
            for (const id in modelLoadParams) {
                modelParamsList.push(modelLoadParams[id]);
            }
            if (modelParamsList.length === 0) {
                ok();
                return;
            }
            this._loadModel(modelParamsList, modelParamsList.length - 1, ok);
        }
    }

    _loadModel(modelLoadParams, i, ok) {
        this.load(modelLoadParams[i], function () {
            if (i === 0) {
                ok();
            } else {
                this._loadModel(modelLoadParams, i - 1, ok);
            }
        });
    }

    /**
     * Destroys models loaded by this plugin.
     */
    clear() {
        for (const id in this.models) {
            this.models[id].destroy();
        }
    }

    /**
     * Destroys this plugin, after first destroying any models it has loaded.
     */
    destroy() {
        this.clear();
        super.destroy();
    }
}

export {ModelsPlugin}