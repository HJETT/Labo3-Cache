import * as utilities from "../utilities.js";
import * as serverVariables from "../serverVariables.js";
import Repository from "./repository.js";

let requestCachesExpirationTime = serverVariables.get("main.repository.CacheExpirationTime");

global.requestCaches = [];
global.cachedRequestsCleanerStarted = false;

export default class CachedRequestManager {
    static startCachedRequestCleaner() {
        setInterval(CachedRequestManager.flushExpired, requestCachesExpirationTime * 1000)
        console.log(BgMagenta + FgBlack, "[Periodic requests caches cleaning process started...]");
    }

    static add(url, content, ETag = "") {
        if (!cachedRequestsCleanerStarted) {
            cachedRequestsCleanerStarted = true;
            CachedRequestManager.startCachedRequestCleaner();
        }
        if (url != "") {
            CachedRequestManager.clear(url);
            requestCaches.push({
                url,
                content,
                ETag,
                Expire_Time: utilities.nowInSeconds() + requestCachesExpirationTime
            });
            console.log(BgMagenta + FgBlack, `[Request of ${url} has been cached]`);
        }
    }

    static find(url) {
        try {
            if (url != "") {
                for (let cache of requestCaches) {
                    if (cache.url == url) {
                        cache.Expire_Time = utilities.nowInSeconds + requestCachesExpirationTime;
                        console.log(BgMagenta + FgBlack, `[${cache.url} url retrieved from cache]`);
                        return cache;
                    }
                }
            }
        } catch (error) {
            console.log(BgMagenta + FgRed, "[request cache error!]", error)
        }
        return null;
    }

    static clear(url) {
        if (url != "") {
            let indexToDelete = [];
            let index = 0;
            for (let cache of requestCaches) {
                if (cache.url == url)
                    indexToDelete.push(index);
                index++;
            }
            utilities.deleteByIndex(requestCaches, indexToDelete);
        }
    }

    static flushExpired() {
        let now = utilities.nowInSeconds();
        for (let cache of requestCaches) {
            if (cache.Expire_Time <= now) {
                console.log(BgMagenta + FgBlack, "Cached request from " + cache.url + " expired");
            }
        }
        requestCaches = requestCaches.filter(cache => cache.Expire_Time > now);
    }

    static get(HttpContext) {
        if(!HttpContext.isCacheable)
            return false;
        
        let url = HttpContext.req.url;
        let cache = CachedRequestManager.find(url);

        if(cache == null)
            return false;

        let ETag = Repository.getETag(HttpContext.path.model);
        if(cache.ETag != ETag){
            CachedRequestManager.clear(url);
            return false;
        }
      
        HttpContext.response.JSON(cache.content, cache.ETag, true);    
        return true;
    }

}