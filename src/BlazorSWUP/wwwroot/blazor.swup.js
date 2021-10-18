; (function () {
    log('starting...')

    var scriptTags = [].slice.call(document.scripts);

    var blzorSwupScriptTag = scriptTags.find(s => s.src && s.src.indexOf('_content/BlazorSWUP/blazor.swup.js') !== -1);
    if (!blzorSwupScriptTag) {
        warn('no blazor.swup.js script tag found!');
        return;
    }

    var debugAttribute = blzorSwupScriptTag.attributes['debug'];
    var debug = debugAttribute && debugAttribute.value && debugAttribute.value.toLowerCase() === 'true';

    var swAttribute = blzorSwupScriptTag.attributes['sw'];
    var sw = (swAttribute && swAttribute.value) || 'service-worker.js';

    var progressHandlerName = 'blazorSwup';
    var progressHandlerAttribute = blzorSwupScriptTag.attributes['handler'];
    if (progressHandlerAttribute && progressHandlerAttribute.value) {
        progressHandlerName = progressHandlerAttribute.value;
    }
    var progressHandler = window[progressHandlerName];
    if (!progressHandler || typeof progressHandler !== 'function') {
        warn(`progress handler (window.${progressHandlerName}) is not a function!`);
        progressHandler = undefined;
    }

    if (!('serviceWorker' in navigator)) {
        warn('no serviceWorker in navigator');
        return;
    }

    navigator.serviceWorker.register(sw).then(prepareRegistration);
    navigator.serviceWorker.addEventListener('message', handleMessage);
    navigator.serviceWorker.addEventListener('controllerchange', handleController);

    function prepareRegistration(reg) {
        window.reloadPage = function () {
            if (navigator.serviceWorker.controller) {
                reg.waiting && reg.waiting.postMessage('SKIP_WAITING');
            } else {
                window.location.reload();
            }
        };

        if (reg.waiting) {
            if (reg.installing) {
                handle('installing');
            } else {
                handle('installed');
            }
        }

        reg.addEventListener('updatefound', function (e) {
            log('update found', e);
            handle('update_found', e);
            if (!reg.installing) {
                warn('no registration.installing found!');
                return;
            }
            reg.installing.addEventListener('statechange', function (e) {
                log('state chnaged', e, 'eventPhase:', e.eventPhase, 'currentTarget.state:', e.currentTarget.state);
                handle('state_changed', e);

                if (!reg.waiting) return;

                if (navigator.serviceWorker.controller) {
                    log('update finished.');
                } else {
                    log('initialization finished.');
                }
            });
        });
    }


    function handleMessage(e) {
        const message = JSON.parse(e.data);
        const type = message.type;
        const data = message.data;

        if (type === 'installing') {
            handle('installing', data);
        }

        if (type === 'progress') {
            handle('progress', data);
        }

        if (type === 'installed') {
            handle('installed', { ...data, reload: () => window.reloadPage() });
        }

        if (type === 'activate') {
            handle('activate', data);
        }
    }


    var refreshing = false;
    function handleController(e) {
        log('controller changed.', e);
        handle('controller_changed', e);
        if (refreshing) {
            warn('app is already refreshing...');
            return;
        }
        refreshing = true;
        window.location.reload();
    }

    function handle() {
        progressHandler && progressHandler(...arguments);
    }

    function log() {
        _l('log', ...arguments);
    }

    function warn() {
        _l('warn', ...arguments);
    }

    function _l(fn, ...args) {
        debug && console[fn]('BlazorSWUP:', ...args);
    }

}());