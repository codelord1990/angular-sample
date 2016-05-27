import { Tree, TreeNode } from './utils/tree';
import { shallowEqual } from './utils/collection';
import { PRIMARY_OUTLET } from './shared';
export function createEmptyUrlTree() {
    return new UrlTree(new TreeNode(new UrlSegment("", {}, PRIMARY_OUTLET), []), {}, null);
}
export class UrlTree extends Tree {
    constructor(root, queryParameters, fragment) {
        super(root);
        this.queryParameters = queryParameters;
        this.fragment = fragment;
    }
}
export class UrlSegment {
    constructor(path, parameters, outlet) {
        this.path = path;
        this.parameters = parameters;
        this.outlet = outlet;
    }
    toString() {
        const params = [];
        for (let prop in this.parameters) {
            if (this.parameters.hasOwnProperty(prop)) {
                params.push(`${prop}=${this.parameters[prop]}`);
            }
        }
        const paramsString = params.length > 0 ? `(${params.join(',')})` : '';
        const outlet = this.outlet === PRIMARY_OUTLET ? '' : `${this.outlet}:`;
        return `${outlet}${this.path}${paramsString}`;
    }
}
export function equalUrlSegments(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; ++i) {
        if (a[i].path !== b[i].path)
            return false;
        if (!shallowEqual(a[i].parameters, b[i].parameters))
            return false;
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJsX3RyZWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvdXJsX3RyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ik9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sY0FBYztPQUN0QyxFQUFFLFlBQVksRUFBRSxNQUFNLG9CQUFvQjtPQUMxQyxFQUFFLGNBQWMsRUFBRSxNQUFNLFVBQVU7QUFFekM7SUFDRSxNQUFNLENBQUMsSUFBSSxPQUFPLENBQUMsSUFBSSxRQUFRLENBQWEsSUFBSSxVQUFVLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxjQUFjLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDckcsQ0FBQztBQUtELDZCQUE2QixJQUFJO0lBQy9CLFlBQVksSUFBMEIsRUFBUyxlQUF3QyxFQUFTLFFBQXVCO1FBQ3JILE1BQU0sSUFBSSxDQUFDLENBQUM7UUFEaUMsb0JBQWUsR0FBZixlQUFlLENBQXlCO1FBQVMsYUFBUSxHQUFSLFFBQVEsQ0FBZTtJQUV2SCxDQUFDO0FBQ0gsQ0FBQztBQUVEO0lBQ0UsWUFBbUIsSUFBWSxFQUFTLFVBQW1DLEVBQVMsTUFBYztRQUEvRSxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQVMsZUFBVSxHQUFWLFVBQVUsQ0FBeUI7UUFBUyxXQUFNLEdBQU4sTUFBTSxDQUFRO0lBQUcsQ0FBQztJQUV0RyxRQUFRO1FBQ04sTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBQ2xCLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDekMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNsRCxDQUFDO1FBQ0gsQ0FBQztRQUNELE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUN0RSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxLQUFLLGNBQWMsR0FBRyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUM7UUFDdkUsTUFBTSxDQUFDLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsWUFBWSxFQUFFLENBQUM7SUFDaEQsQ0FBQztBQUNILENBQUM7QUFFRCxpQ0FBaUMsQ0FBZSxFQUFFLENBQWU7SUFDL0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUN4QyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUNsQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFBQyxNQUFNLENBQUMsS0FBSyxDQUFDO1FBQzFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUNwRSxDQUFDO0lBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQztBQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUcmVlLCBUcmVlTm9kZSB9IGZyb20gJy4vdXRpbHMvdHJlZSc7XG5pbXBvcnQgeyBzaGFsbG93RXF1YWwgfSBmcm9tICcuL3V0aWxzL2NvbGxlY3Rpb24nO1xuaW1wb3J0IHsgUFJJTUFSWV9PVVRMRVQgfSBmcm9tICcuL3NoYXJlZCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbXB0eVVybFRyZWUoKSB7XG4gIHJldHVybiBuZXcgVXJsVHJlZShuZXcgVHJlZU5vZGU8VXJsU2VnbWVudD4obmV3IFVybFNlZ21lbnQoXCJcIiwge30sIFBSSU1BUllfT1VUTEVUKSwgW10pLCB7fSwgbnVsbCk7XG59XG5cbi8qKlxuICogQSBVUkwgaW4gdGhlIHRyZWUgZm9ybS5cbiAqL1xuZXhwb3J0IGNsYXNzIFVybFRyZWUgZXh0ZW5kcyBUcmVlPFVybFNlZ21lbnQ+IHtcbiAgY29uc3RydWN0b3Iocm9vdDogVHJlZU5vZGU8VXJsU2VnbWVudD4sIHB1YmxpYyBxdWVyeVBhcmFtZXRlcnM6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9LCBwdWJsaWMgZnJhZ21lbnQ6IHN0cmluZyB8IG51bGwpIHtcbiAgICBzdXBlcihyb290KTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVXJsU2VnbWVudCB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBwYXRoOiBzdHJpbmcsIHB1YmxpYyBwYXJhbWV0ZXJzOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSwgcHVibGljIG91dGxldDogc3RyaW5nKSB7fVxuXG4gIHRvU3RyaW5nKCkge1xuICAgIGNvbnN0IHBhcmFtcyA9IFtdO1xuICAgIGZvciAobGV0IHByb3AgaW4gdGhpcy5wYXJhbWV0ZXJzKSB7XG4gICAgICBpZiAodGhpcy5wYXJhbWV0ZXJzLmhhc093blByb3BlcnR5KHByb3ApKSB7XG4gICAgICAgIHBhcmFtcy5wdXNoKGAke3Byb3B9PSR7dGhpcy5wYXJhbWV0ZXJzW3Byb3BdfWApO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBwYXJhbXNTdHJpbmcgPSBwYXJhbXMubGVuZ3RoID4gMCA/IGAoJHtwYXJhbXMuam9pbignLCcpfSlgIDogJyc7XG4gICAgY29uc3Qgb3V0bGV0ID0gdGhpcy5vdXRsZXQgPT09IFBSSU1BUllfT1VUTEVUID8gJycgOiBgJHt0aGlzLm91dGxldH06YDtcbiAgICByZXR1cm4gYCR7b3V0bGV0fSR7dGhpcy5wYXRofSR7cGFyYW1zU3RyaW5nfWA7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVxdWFsVXJsU2VnbWVudHMoYTogVXJsU2VnbWVudFtdLCBiOiBVcmxTZWdtZW50W10pOiBib29sZWFuIHtcbiAgaWYgKGEubGVuZ3RoICE9PSBiLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGEubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoYVtpXS5wYXRoICE9PSBiW2ldLnBhdGgpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIXNoYWxsb3dFcXVhbChhW2ldLnBhcmFtZXRlcnMsIGJbaV0ucGFyYW1ldGVycykpIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cbiJdfQ==