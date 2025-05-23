/**
 * Copyright 2017, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
// Disable ESLint because some of the names to include are not in camel case
import expect from 'expect';
import FilterBuilder from '../FilterBuilder';
import {processOGCGeometry} from "../../GML";
describe('FilterBuilder', () => {
    it('comparison', () => {
        const b = new FilterBuilder();
        expect(b.property("PROPERTY").equalTo("VALUE"))
            .toBe("<ogc:PropertyIsEqualTo><ogc:PropertyName>PROPERTY</ogc:PropertyName><ogc:Literal>VALUE</ogc:Literal></ogc:PropertyIsEqualTo>");
        expect(b.property("PROPERTY").greaterThen(1))
            .toBe("<ogc:PropertyIsGreaterThan><ogc:PropertyName>PROPERTY</ogc:PropertyName><ogc:Literal>1</ogc:Literal></ogc:PropertyIsGreaterThan>");
        expect(b.property("PROPERTY").lessThen(1))
            .toBe("<ogc:PropertyIsLessThan><ogc:PropertyName>PROPERTY</ogc:PropertyName><ogc:Literal>1</ogc:Literal></ogc:PropertyIsLessThan>");
        expect(b.property("PROPERTY").greaterThenOrEqualTo(1))
            .toBe("<ogc:PropertyIsGreaterThanOrEqualTo><ogc:PropertyName>PROPERTY</ogc:PropertyName><ogc:Literal>1</ogc:Literal></ogc:PropertyIsGreaterThanOrEqualTo>");
        expect(b.property("PROPERTY").lessThenOrEqualTo(1))
            .toBe("<ogc:PropertyIsLessThanOrEqualTo><ogc:PropertyName>PROPERTY</ogc:PropertyName><ogc:Literal>1</ogc:Literal></ogc:PropertyIsLessThanOrEqualTo>");
        expect(b.property("PROPERTY").notEqualTo("VALUE"))
            .toBe("<ogc:PropertyIsNotEqualTo><ogc:PropertyName>PROPERTY</ogc:PropertyName><ogc:Literal>VALUE</ogc:Literal></ogc:PropertyIsNotEqualTo>");
        expect(b.property("PROPERTY").between(1, 2)).toBe("<ogc:PropertyIsBetween><ogc:PropertyName>PROPERTY</ogc:PropertyName><ogc:LowerBoundary><ogc:Literal>1</ogc:Literal></ogc:LowerBoundary><ogc:UpperBoundary><ogc:Literal>2</ogc:Literal></ogc:UpperBoundary></ogc:PropertyIsBetween>");
        expect(b.property("PROPERTY").like("VALUE"))
            .toBe('<ogc:PropertyIsLike matchCase="true" wildCard="*" singleChar="." escapeChar="!"><ogc:PropertyName>PROPERTY</ogc:PropertyName><ogc:Literal>VALUE</ogc:Literal></ogc:PropertyIsLike>');
        expect(b.property("PROPERTY").ilike("VALUE"))
            .toBe('<ogc:PropertyIsLike matchCase="false" wildCard="*" singleChar="." escapeChar="!"><ogc:PropertyName>PROPERTY</ogc:PropertyName><ogc:Literal>VALUE</ogc:Literal></ogc:PropertyIsLike>');
        expect(b.property("PROPERTY").isNull())
            .toBe("<ogc:PropertyIsNull><ogc:PropertyName>PROPERTY</ogc:PropertyName></ogc:PropertyIsNull>");
    });
    it('spatial', () => {
        const b = new FilterBuilder();
        const testGeom = {type: "Point", coordinates: [1, 2]};
        const geomGML = processOGCGeometry("3.1.1", testGeom);
        expect(b.property("GEOMETRY").intersects( testGeom ))
            .toBe(`<ogc:Intersects><ogc:PropertyName>GEOMETRY</ogc:PropertyName>${geomGML}</ogc:Intersects>`);
        expect(b.property("GEOMETRY").contains( testGeom )).toBe(`<ogc:Contains><ogc:PropertyName>GEOMETRY</ogc:PropertyName>${geomGML}</ogc:Contains>`);
        expect(b.property("GEOMETRY").within(testGeom) ).toBe(`<ogc:Within><ogc:PropertyName>GEOMETRY</ogc:PropertyName>${geomGML}</ogc:Within>`);
        expect(b.property("GEOMETRY").dwithin(testGeom, 200)).toBe(`<ogc:DWithin><ogc:PropertyName>GEOMETRY</ogc:PropertyName>${geomGML}<ogc:Distance units="m">200</ogc:Distance></ogc:DWithin>`);
    });
    it('logical', () => {
        const b = new FilterBuilder();
        const testGeom1 = {type: "Point", coordinates: [1, 2]};
        const geomGML1 = processOGCGeometry("3.1.1", testGeom1);
        const intersectsElem1 = `<ogc:Intersects><ogc:PropertyName>GEOMETRY</ogc:PropertyName>${geomGML1}</ogc:Intersects>`;
        const testGeom2 = {type: "Point", coordinates: [3, 4]};
        const geomGML2 = processOGCGeometry("3.1.1", testGeom2);
        const intersectsElem2 = `<ogc:Intersects><ogc:PropertyName>GEOMETRY</ogc:PropertyName>${geomGML2}</ogc:Intersects>`;

        // as argument list
        expect(
            b.and(b.property("GEOMETRY").intersects(testGeom1), b.property("GEOMETRY").intersects(testGeom2))
        ).toBe(`<ogc:And>${intersectsElem1}${intersectsElem2}</ogc:And>`);
        expect(
            b.or(b.property("GEOMETRY").intersects(testGeom1), b.property("GEOMETRY").intersects(testGeom2))
        ).toBe(`<ogc:Or>${intersectsElem1}${intersectsElem2}</ogc:Or>`);

        // as array
        expect(
            b.and([b.property("GEOMETRY").intersects(testGeom1), b.property("GEOMETRY").intersects(testGeom2)])
        ).toBe(`<ogc:And>${intersectsElem1}${intersectsElem2}</ogc:And>`);
        expect(
            b.or([b.property("GEOMETRY").intersects(testGeom1), b.property("GEOMETRY").intersects(testGeom2)])
        ).toBe(`<ogc:Or>${intersectsElem1}${intersectsElem2}</ogc:Or>`);
        // not
        expect(
            b.not(b.property("GEOMETRY").intersects(testGeom1))
        ).toBe(`<ogc:Not>${intersectsElem1}</ogc:Not>`);

        // compose
        expect(b.or(
            b.and(b.property("GEOMETRY").intersects(testGeom1), b.not(b.property("GEOMETRY").intersects(testGeom2))),
            b.and(b.property("GEOMETRY").intersects(testGeom2), b.not(b.property("GEOMETRY").intersects(testGeom1)))
        )).toBe(`<ogc:Or><ogc:And>${intersectsElem1}<ogc:Not>${intersectsElem2}</ogc:Not></ogc:And>`
            + `<ogc:And>${intersectsElem2}<ogc:Not>${intersectsElem1}</ogc:Not></ogc:And>`
            + `</ogc:Or>`);
        // empty array returns empty filter instead of <And>undefined</And>
        // to check if is better to return an empty filter like <ogc:And></ogc:And> or <ogc:Or/>
        expect(b.and()).toBe("");
        expect(b.or()).toBe("");
        expect(b.not()).toBe("");
        expect(b.nor()).toBe("");
    });

    it('valueReference 1.1.0', () => {
        const b = new FilterBuilder();
        expect(b.valueReference("PROPERTY")).toBe("<ogc:PropertyName>PROPERTY</ogc:PropertyName>");
    });
    it('array of propertyNames translated into a sequesnce of propertyName tags', () => {
        const b = new FilterBuilder();
        expect(b.valueReference(["PROPERTY1", "PROPERTY2"])).toBe("<ogc:PropertyName>PROPERTY1</ogc:PropertyName><ogc:PropertyName>PROPERTY2</ogc:PropertyName>");
    });
    it('valueReference wfs 2.0', () => {
        const b = new FilterBuilder({wfsVersion: '2.0'});
        expect(b.valueReference("PROPERTY")).toBe("<ogc:ValueReference>PROPERTY</ogc:ValueReference>");
    });
    it('func', () => {
        const b = new FilterBuilder();
        expect(b.func("funcName", b.valueReference('propName'), b.literal('value'))).toBe('<ogc:Function name="funcName"><ogc:PropertyName>propName</ogc:PropertyName><ogc:Literal>value</ogc:Literal></ogc:Function>');
    });
});
