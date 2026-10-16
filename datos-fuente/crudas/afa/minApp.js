if (window._dfMc === undefined) {
    // HTML Center global var
    window._dfMc = {};
}

// Initial settings
_dfMc.initSettings = {
    apiKey: "%%xxxpp4f4xxxpp%%",
    pathToApp: "",
    lang: 'es',
    requireLite: true,
    devMode: false,
    location: 'LA',
    appVersion: '4.1.0'
};

((_dfMc) => {
    // Genero un ts con minutos, segundos y milisegundos seteados en 0
    _dfMc.initSettings.cacheTimestamp = (new Date()).getTime();

    _dfMc.fn = {};

    /**
    * Obtener parámetros de la URL
    * 
    * @param name nombre del parámetro a obtener
    * @param defaultValue
    * 
    * @return string|boolean|int devuelve el defaultValue si el parámetro no existe
    **/
    _dfMc.fn.getParameter = (name, defaultValue) => {
    const value = new URLSearchParams(window.location.search).get(name);

    if (value){
        if (value === "true") {
            return true;
        } else if(value === "false") {
            return false;
        } else if(!isNaN(value)){
            return parseInt(value, 10);
        }

        return value;
    }

        return defaultValue;
    };

    // // Levanto por parametro si estoy en devMode o no
    // _dfMc.initSettings.devMode = _dfMc.fn.getParameter(
    //     'devMode',
    //     _dfMc.initSettings.devMode !== undefined ? _dfMc.initSettings.devMode : false
    // );
    // _dfMc.devMode = _dfMc.initSettings.devMode;
    
    //Obtener el path este script (minapp) para usarlo como referencia constante para los paths relativos
    const currentScriptSrc = document.currentScript.src;
    let pathToApp = currentScriptSrc.replace(/\/minApp\.js.*$/, "/");

    //__webpack_public_path__ = currentScriptSrc.replace(/\/[^/]*$/, '/');
    //console.log('__webpack_public_path__: ', __webpack_public_path__);

    if (_dfMc.initSettings.pathToApp !== undefined && _dfMc.initSettings.pathToApp.length > 0){
        _dfMc.initSettings.pathToApp = _dfMc.initSettings.pathToApp.replace(/\/$/g, '').replace(/\//g, "\/") + "\/";
        pathToApp = `${_dfMc.initSettings.pathToApp}minapp/`;
    }

    window._pathToApp = pathToApp;

    import(
        /* webpackIgnore: true */
        pathToApp + 'init/init.min.js'
    );
})(window._dfMc);
