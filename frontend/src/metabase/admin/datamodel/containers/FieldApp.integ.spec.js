import {
    login,
    createTestStore,
} from "metabase/__support__/integrated_tests";

import {
    DELETE_FIELD_DIMENSION,
    deleteFieldDimension,
    FETCH_TABLE_METADATA,
    fetchTableMetadata,
    UPDATE_FIELD,
    UPDATE_FIELD_DIMENSION,
    UPDATE_FIELD_VALUES,
    updateField,
    updateFieldValues
} from "metabase/redux/metadata"

import { metadata as staticFixtureMetadata } from "metabase/__support__/sample_dataset_fixture"

import React from 'react';
import { mount } from "enzyme";
import { FETCH_IDFIELDS } from "metabase/admin/datamodel/datamodel";
import { delay } from "metabase/lib/promise"
import FieldApp, {
    FieldHeader, FieldRemapping, FieldValueMapping,
    ValueRemappings
} from "metabase/admin/datamodel/containers/FieldApp";
import Input from "metabase/components/Input";
import {
    FieldVisibilityPicker,
    SpecialTypeAndTargetPicker
} from "metabase/admin/datamodel/components/database/ColumnItem";
import { TestPopover } from "metabase/components/Popover";
import Select from "metabase/components/Select";
import SelectButton from "metabase/components/SelectButton";
import ButtonWithStatus from "metabase/components/ButtonWithStatus";

const getRawFieldWithId = (store, fieldId) => store.getState().metadata.fields[fieldId];

// TODO: Should we use the metabase/lib/urls methods for constructing urls also here?

// TODO Atte Keinänen 7/10/17: Use fixtures after metabase-lib branch has been merged

const CREATED_AT_ID = 1;
const PRODUCT_ID_FK_ID = 3;
const USER_ID_FK_ID = 7;
// enumeration with values 1, 2, 3, 4 or 5
const USER_SOURCE_TABLE_ID = 2;
const USER_SOURCE_ID = 18;

const PRODUCT_RATING_TABLE_ID = 4;
const PRODUCT_RATING_ID = 33;

const initFieldApp = async ({ tableId = 1, fieldId }) => {
    const store = await createTestStore()
    store.pushPath(`/admin/datamodel/database/1/table/${tableId}/${fieldId}`);
    const fieldApp = mount(store.connectContainer(<FieldApp />));
    await store.waitForActions([FETCH_IDFIELDS]);
    store.resetDispatchedActions();
    return { store, fieldApp }
}

describe("FieldApp", () => {
    beforeAll(async () => {
        await login()
    })

    describe("name settings", () => {
        const newTitle = 'Brought Into Existence At'
        const newDescription = 'The point in space-time when this order saw the light.'

        it("lets you change field name and description", async () => {
            const { store, fieldApp } = await initFieldApp({ fieldId: CREATED_AT_ID });

            const header = fieldApp.find(FieldHeader)
            expect(header.length).toBe(1)

            const nameInput = header.find(Input).at(0);
            expect(nameInput.props().value).toBe(staticFixtureMetadata.fields['1'].display_name);
            const descriptionInput = header.find(Input).at(1);
            expect(descriptionInput.props().value).toBe(staticFixtureMetadata.fields['1'].description);

            nameInput.simulate('change', {target: {value: newTitle}});
            await store.waitForActions([UPDATE_FIELD])
            store.resetDispatchedActions();

            descriptionInput.simulate('change', {target: {value: newDescription}});
            await store.waitForActions([UPDATE_FIELD])
        })

        it("should show the entered values after a page reload", async () => {
            const { fieldApp } = await initFieldApp({ fieldId: CREATED_AT_ID });

            const header = fieldApp.find(FieldHeader)
            expect(header.length).toBe(1)
            const nameInput = header.find(Input).at(0);
            const descriptionInput = header.find(Input).at(1);

            expect(nameInput.props().value).toBe(newTitle);
            expect(descriptionInput.props().value).toBe(newDescription);
        })

        afterAll(async () => {
            const store = await createTestStore()
            await store.dispatch(fetchTableMetadata(1));
            const createdAtField = getRawFieldWithId(store, CREATED_AT_ID)

            await store.dispatch(updateField({
                ...createdAtField,
                display_name: staticFixtureMetadata.fields[1].display_name,
                description: staticFixtureMetadata.fields[1].description,
            }))
        })
    })

    describe("visibility settings", () => {
        it("shows correct default visibility", async () => {
            const { fieldApp } = await initFieldApp({ fieldId: CREATED_AT_ID });
            const visibilitySelect = fieldApp.find(FieldVisibilityPicker);
            expect(visibilitySelect.text()).toMatch(/Everywhere/);
        })

        it("lets you change field visibility", async () => {
            const { store, fieldApp } = await initFieldApp({ fieldId: CREATED_AT_ID });

            const visibilitySelect = fieldApp.find(FieldVisibilityPicker);
            visibilitySelect.simulate('click');
            visibilitySelect.find(TestPopover).find("li").at(1).children().first().simulate("click");

            await store.waitForActions([UPDATE_FIELD])
        })

        it("should show the updated visibility setting after a page reload", async () => {
            const { fieldApp } = await initFieldApp({ fieldId: CREATED_AT_ID });

            const picker = fieldApp.find(FieldVisibilityPicker);
            expect(picker.text()).toMatch(/Only in Detail Views/);
        })

        afterAll(async () => {
            const store = await createTestStore()
            await store.dispatch(fetchTableMetadata(1));
            const createdAtField = getRawFieldWithId(store, CREATED_AT_ID)

            await store.dispatch(updateField({
                ...createdAtField,
                visibility_type: "normal",
            }))
        })
    })

    describe("special type and target settings", () => {
        it("shows the correct default special type for a foreign key", async () => {
            const { fieldApp } = await initFieldApp({ fieldId: PRODUCT_ID_FK_ID });
            const picker = fieldApp.find(SpecialTypeAndTargetPicker).text()
            expect(picker).toMatch(/Foreign KeyProducts → ID/);
        })

        it("lets you change the type to 'No special type'", async () => {
            const { store, fieldApp } = await initFieldApp({ fieldId: CREATED_AT_ID });
            const picker = fieldApp.find(SpecialTypeAndTargetPicker)
            const typeSelect = picker.find(Select).at(0)
            typeSelect.simulate('click');

            const noSpecialTypeButton = typeSelect.find(TestPopover).find("li").last().children().first()
            noSpecialTypeButton.simulate("click");

            await store.waitForActions([UPDATE_FIELD])
            expect(picker.text()).toMatch(/Select a special type/);
        })

        it("lets you change the type to 'Number'", async () => {
            const { store, fieldApp } = await initFieldApp({ fieldId: CREATED_AT_ID });
            const picker = fieldApp.find(SpecialTypeAndTargetPicker)
            const typeSelect = picker.find(Select).at(0)
            typeSelect.simulate('click');

            const noSpecialTypeButton = typeSelect.find(TestPopover)
                .find("li")
                .filterWhere(li => li.text() === "Number").first()
                .children().first();

            noSpecialTypeButton.simulate("click");

            await store.waitForActions([UPDATE_FIELD])
            expect(picker.text()).toMatch(/Number/);
        })

        it("lets you change the type to 'Foreign key' and choose the target field", async () => {
            const { store, fieldApp } = await initFieldApp({ fieldId: CREATED_AT_ID });
            const picker = fieldApp.find(SpecialTypeAndTargetPicker)
            const typeSelect = picker.find(Select).at(0)
            typeSelect.simulate('click');

            const foreignKeyButton = typeSelect.find(TestPopover).find("li").at(2).children().first();
            foreignKeyButton.simulate("click");
            await store.waitForActions([UPDATE_FIELD])
            store.resetDispatchedActions();

            expect(picker.text()).toMatch(/Foreign KeySelect a target/);
            const fkFieldSelect = picker.find(Select).at(1)
            fkFieldSelect.simulate('click');

            const productIdField = fkFieldSelect.find(TestPopover)
                .find("li")
                .filterWhere(li => /The numerical product number./.test(li.text()))
                .first().children().first();

            productIdField.simulate('click')
            await store.waitForActions([UPDATE_FIELD])
            expect(picker.text()).toMatch(/Foreign KeyProducts → ID/);
        })

        afterAll(async () => {
            const store = await createTestStore()
            await store.dispatch(fetchTableMetadata(1));
            const createdAtField = getRawFieldWithId(store, CREATED_AT_ID)

            await store.dispatch(updateField({
                ...createdAtField,
                special_type: null,
                fk_target_field_id: null
            }))
        })
    })

    describe("display value / remapping settings", () => {
        it("shows only 'Use original value' for fields without fk and values", async () => {
            const { fieldApp } = await initFieldApp({ fieldId: CREATED_AT_ID });
            const section = fieldApp.find(FieldRemapping)
            const mappingTypePicker = section.find(Select).first();
            expect(mappingTypePicker.text()).toBe('Use original value')

            mappingTypePicker.simulate('click');
            const pickerOptions = mappingTypePicker.find(TestPopover).find("li");
            expect(pickerOptions.length).toBe(1);
        })

        it("lets you change to 'Use foreign key' and change the target for field with fk", async () => {
            const { store, fieldApp } = await initFieldApp({ fieldId: USER_ID_FK_ID });
            const section = fieldApp.find(FieldRemapping)
            const mappingTypePicker = section.find(Select);
            expect(mappingTypePicker.text()).toBe('Use original value')

            mappingTypePicker.simulate('click');
            const pickerOptions = mappingTypePicker.find(TestPopover).find("li");
            expect(pickerOptions.length).toBe(2);

            const useFKButton = pickerOptions.at(1).children().first()
            useFKButton.simulate('click');
            store.waitForActions([UPDATE_FIELD_DIMENSION, FETCH_TABLE_METADATA])
            store.resetDispatchedActions();
            // TODO: Figure out a way to avoid using delay – the use of delays may lead to occasional CI failures
            await delay(500);

            const fkFieldSelect = section.find(SelectButton);

            expect(fkFieldSelect.text()).toBe("Name");
            fkFieldSelect.simulate('click');

            const sourceField = fkFieldSelect.parent().find(TestPopover)
                .find("li")
                .filterWhere(li => /Source/.test(li.text()))
                .first().children().first();

            sourceField.simulate('click')
            store.waitForActions([FETCH_TABLE_METADATA])
            // TODO: Figure out a way to avoid using delay – the use of delays may lead to occasional CI failures
            await delay(500);
            expect(fkFieldSelect.text()).toBe("Source");
        })

        it("doesn't show date fields in fk options", async () => {
            const { fieldApp } = await initFieldApp({ fieldId: USER_ID_FK_ID });
            const section = fieldApp.find(FieldRemapping)
            const mappingTypePicker = section.find(Select);
            expect(mappingTypePicker.text()).toBe('Use foreign key')

            const fkFieldSelect = section.find(SelectButton);
            fkFieldSelect.simulate('click');

            const popover = fkFieldSelect.parent().find(TestPopover);
            expect(popover.length).toBe(1);

            const dateFieldIcons = popover.find("svg.Icon-calendar")
            expect(dateFieldIcons.length).toBe(0);
        })

        it("lets you switch back to Use original value after changing to some other value", async () => {
            const { store, fieldApp } = await initFieldApp({ fieldId: USER_ID_FK_ID });
            const section = fieldApp.find(FieldRemapping)
            const mappingTypePicker = section.find(Select);
            expect(mappingTypePicker.text()).toBe('Use foreign key')

            mappingTypePicker.simulate('click');
            const pickerOptions = mappingTypePicker.find(TestPopover).find("li");
            const useOriginalValue = pickerOptions.first().children().first()
            useOriginalValue.simulate('click');

            store.waitForActions([DELETE_FIELD_DIMENSION, FETCH_TABLE_METADATA]);
        })

        it("doesn't let you enter custom remappings for a field with string values", async () => {
            const { fieldApp } = await initFieldApp({ tableId: USER_SOURCE_TABLE_ID, fieldId: USER_SOURCE_ID });
            const section = fieldApp.find(FieldRemapping)
            const mappingTypePicker = section.find(Select);

            expect(mappingTypePicker.text()).toBe('Use original value')
            mappingTypePicker.simulate('click');
            const pickerOptions = mappingTypePicker.find(TestPopover).find("li");
            expect(pickerOptions.length).toBe(1);
        });

        // TODO: Make sure that product rating is a Category and that a sync has been run
        it("lets you enter custom remappings for a field with numeral values", async () => {
            const { store, fieldApp } = await initFieldApp({ tableId: PRODUCT_RATING_TABLE_ID, fieldId: PRODUCT_RATING_ID });
            const section = fieldApp.find(FieldRemapping)
            const mappingTypePicker = section.find(Select);

            expect(mappingTypePicker.text()).toBe('Use original value')
            mappingTypePicker.simulate('click');
            const pickerOptions = mappingTypePicker.find(TestPopover).find("li");
            expect(pickerOptions.length).toBe(2);

            const customMappingButton = pickerOptions.at(1).children().first()
            customMappingButton.simulate('click');

            store.waitForActions([UPDATE_FIELD_DIMENSION, FETCH_TABLE_METADATA])
            // TODO: Figure out a way to avoid using delay – using delays may lead to occasional CI failures
            await delay(500);

            const valueRemappingsSection = section.find(ValueRemappings);
            expect(valueRemappingsSection.length).toBe(1);

            const fieldValueMappings = valueRemappingsSection.find(FieldValueMapping);
            expect(fieldValueMappings.length).toBe(5);

            const firstMapping = fieldValueMappings.at(0);
            expect(firstMapping.find("h3").text()).toBe("1");
            expect(firstMapping.find(Input).props().value).toBe("1");
            firstMapping.find(Input).simulate('change', {target: {value: "Terrible"}});

            const lastMapping = fieldValueMappings.last();
            expect(lastMapping.find("h3").text()).toBe("5");
            expect(lastMapping.find(Input).props().value).toBe("5");
            lastMapping.find(Input).simulate('change', {target: {value: "Extraordinarily awesome"}});

            const saveButton = valueRemappingsSection.find(ButtonWithStatus)
            saveButton.simulate("click");

            store.waitForActions([UPDATE_FIELD_VALUES]);
        });
        
        it("shows the updated values after page reload", async () => {
            const { fieldApp } = await initFieldApp({ tableId: PRODUCT_RATING_TABLE_ID, fieldId: PRODUCT_RATING_ID });
            const section = fieldApp.find(FieldRemapping)
            const mappingTypePicker = section.find(Select);

            expect(mappingTypePicker.text()).toBe('Custom mapping');
            const fieldValueMappings = section.find(FieldValueMapping);
            expect(fieldValueMappings.first().find(Input).props().value).toBe("Terrible");
            expect(fieldValueMappings.last().find(Input).props().value).toBe("Extraordinarily awesome");
        });

        afterAll(async () => {
            const store = await createTestStore()

            await store.dispatch(deleteFieldDimension(USER_ID_FK_ID));
            await store.dispatch(deleteFieldDimension(PRODUCT_RATING_ID));

            // TODO: This is a little hacky – could there be a way to simply reset the user-defined valued?
            await store.dispatch(updateFieldValues(PRODUCT_RATING_ID, [
                [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']
            ]));
        })
    })

})