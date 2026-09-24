import { UrlSerializer, DefaultUrlSerializer, UrlTree } from '@angular/router';

export class CustomUrlSerializer implements UrlSerializer {
    parse(url: any): UrlTree {
        let dus = new DefaultUrlSerializer();
        return dus.parse(url);
    }

    serialize(tree: UrlTree): any {
        let dus = new DefaultUrlSerializer(),
            path = dus.serialize(tree);
        path = decodeURIComponent(path);
        return path;
    }
}
