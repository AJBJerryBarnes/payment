import { FormField, Input, ViewPicker, initializeBlock,useGlobalConfig, useSettingsButton, 
	useBase, useRecords, expandRecord, Button, TextButton, ViewportConstraint,
	Box,
    Heading,
    ViewPickerSynced,
    RecordCard,
    TablePickerSynced,
    FieldPickerSynced} from '@airtable/blocks/ui';
import React, { useState  } from "react"; 
import { FieldType } from '@airtable/blocks/models';

const GlobalConfigKeys = {
    MEMBER_TABLE_ID: 'memberTableId',
	MEMBER_NAME_FIELD_ID: 'nameFieldId',
	MEMBER_ADDRESS_FIELD_ID: 'addressFieldId',
	MEMBER_POSTCODE_FIELD_ID: 'postcodeFieldId',
    PAYMENT_TABLE_ID: 'paymentTableId',
    PAYMENT_MEMBER_LINK_FIELD_ID: 'linkFieldId',
	PAYMENT_DATE_FIELD_ID: 'dateFieldId',
};


function Payment() {
	
	const VIEWPORT_MIN_WIDTH = 345;
    const VIEWPORT_MIN_HEIGHT = 200;

    const base = useBase();

	
    const globalConfig = useGlobalConfig();
	
    // Read the user's choice for which table and views to use from globalConfig.
	// we need the member table, the payment table (prepayment and hamper payment at present)
	// and the field on the payment table which links to member details plus
	// name and address fields from members and the payment date
	const memberTableId 	= globalConfig.get(GlobalConfigKeys.MEMBER_TABLE_ID);
    const paymentTableId 	= globalConfig.get(GlobalConfigKeys.PAYMENT_TABLE_ID);
    const linkFieldId 		= globalConfig.get(GlobalConfigKeys.PAYMENT_MEMBER_LINK_FIELD_ID);
    const dateFieldId 		= globalConfig.get(GlobalConfigKeys.PAYMENT_DATE_FIELD_ID);
    const nameFieldId 		= globalConfig.get(GlobalConfigKeys.MEMBER_NAME_FIELD_ID);
    const addressFieldId 	= globalConfig.get(GlobalConfigKeys.MEMBER_ADDRESS_FIELD_ID);
    const postcodeFieldId 	= globalConfig.get(GlobalConfigKeys.MEMBER_POSTCODE_FIELD_ID);


    const initialSetupDone = memberTableId && paymentTableId && linkFieldId  &&
							 dateFieldId && nameFieldId && addressFieldId && postcodeFieldId ? true : false;

    // Use settings menu to hide away table pickers
    const [isShowingSettings, setIsShowingSettings] = useState(!initialSetupDone);
    useSettingsButton(function() {
        initialSetupDone && setIsShowingSettings(!isShowingSettings);
    });
	
    const memberTable = base.getTableByIdIfExists(memberTableId);
    const paymentTable = base.getTableByIdIfExists(paymentTableId);
		
	const linkField = paymentTable ? paymentTable.getFieldByIdIfExists(linkFieldId) : null;
	const dateField = paymentTable ? paymentTable.getFieldByIdIfExists(dateFieldId) : null;

	const nameField 	= memberTable ? memberTable.getFieldByIdIfExists(nameFieldId) : null;
	const addressField 	= memberTable ? memberTable.getFieldByIdIfExists(addressFieldId) : null;
	const postcodeField = memberTable ? memberTable.getFieldByIdIfExists(postcodeFieldId) : null;
	
	const [memberName, setMemberName] = useState("");
	const [memberNo, setMemberNo] = useState("");	
	const [memberRecId, setMemberRecId] = useState("");
	const [paymentRecId, setPaymentRecId] = useState("");

	//const memberQuery = memberTable.selectRecords();
    //const memberRecordset = useRecords(memberQuery);
	
	const memberRecordset = useRecords(memberTable ? memberTable.selectRecords() : null);

    // the filter will give a case insensitive search provided at least 1 chr is entered
	const memberRecords = memberRecordset ? memberRecordset.filter(member => {
			return (memberName.length > 0 && member.getCellValue(nameField).toUpperCase().startsWith(memberName.toUpperCase()))
		}) : null;
	
	const paymentRecordset = useRecords(paymentTable ? paymentTable.selectRecords() : null);

    // the filter will the payment record just created
	const paymentRecords = paymentRecordset ? paymentRecordset.filter(payment => {
			return payment.id ==  paymentRecId
		}) : null;
	
	if (paymentRecords && paymentRecords.length > 0 && !isShowingSettings) {expandRecord(paymentRecords[0]);setPaymentRecId(-1);}

	if (isShowingSettings) {
		if (paymentRecId != null){setPaymentRecId(null);}
        return (
            <ViewportConstraint minSize={{width: VIEWPORT_MIN_WIDTH, height: VIEWPORT_MIN_HEIGHT}}>
                <SettingsMenu
                    globalConfig={globalConfig}
                    base={base}
                    memberTable={memberTable}
                    paymentTable={paymentTable}
					linkField={linkField}
					dateField={dateField}
					nameField={nameField}
					addressField={addressField}
					postcodeField={postcodeField}
                    initialSetupDone={initialSetupDone}
                    onDoneClick={() => setIsShowingSettings(false)}
                />
            </ViewportConstraint>
        )
    } else {
		if (paymentRecId != null){
			return(
			<div>
				<FormField label="Member name">
					<Input value={memberName} onChange={e => memberNameChange(setMemberName,e.target.value, setPaymentRecId)} />
				</FormField>
			</div>
			);
		}else{
			return (
				<div>
					<FormField label="Member name">
						<Input value={memberName} onChange={e => memberNameChange(setMemberName,e.target.value, setPaymentRecId)} />
					</FormField>			
					
					{memberRecords.map(record => (
						<li key={record.id}>
							<TextButton
								variant="dark"
								size="xlarge"
								onClick={() => {
									createPayment(paymentTable, linkFieldId, dateFieldId, record.id, setPaymentRecId);
								}}
								
							>
							{record.getCellValue(nameField)} ,
							</TextButton> 
							{record.getCellValue(addressField)} , {record.getCellValue(postcodeField)} 
							
						</li>
					))}
					
				</div>		
			);
		}
		
	}
}

function memberNameChange(settera, value, setterb){
	settera(value);
	setterb(null);
}

async function createPayment(tPayments, linkField, dateField, memberRecordId, setPaymentRecId){
	
	if (tPayments.hasPermissionToCreateRecord()) {
		
		const field = tPayments.getFieldById(dateField);
		var newRecordId;
		if (field.type == FieldType.DATE_TIME ||
		    field.type == FieldType.DATE) {
		   
			//find the date to set in the record
			let now = new Date();

			newRecordId = await tPayments.createRecordAsync({
							[linkField]: [{id: memberRecordId}],
							[dateField]: now,
								});
		} else {
			newRecordId = await tPayments.createRecordAsync({
				[linkField]: [{id: memberRecordId}],
				});

		}
		// when the promise resolves to the id of the record created
		// save it so that when we restart the new record can be read
		// and displayed for update
		setPaymentRecId(newRecordId);
	}
}

function SettingsMenu(props) {

    const resetPaymentTableRelatedKeys = () => {
        props.globalConfig.setAsync(GlobalConfigKeys.MEMBER_TABLE_ID, '');
        props.globalConfig.setAsync(GlobalConfigKeys.PAYMENT_MEMBER_LINK_FIELD_ID, '');
        props.globalConfig.setAsync(GlobalConfigKeys.PAYMENT_DATE_FIELD_ID, '');
        props.globalConfig.setAsync(GlobalConfigKeys.MEMBER_NAME_FIELD_ID, '');
        props.globalConfig.setAsync(GlobalConfigKeys.MEMBER_ADDRESS_FIELD_ID, '');
        props.globalConfig.setAsync(GlobalConfigKeys.MEMBER_POSTCODE_FIELD_ID, '');
		
    };

    const getLinkedMemberTable = () => {
        const linkFieldId = props.globalConfig.get(GlobalConfigKeys.PAYMENT_MEMBER_LINK_FIELD_ID);
        const paymentTableId = props.globalConfig.get(GlobalConfigKeys.PAYMENT_TABLE_ID);
        const paymentTable = props.base.getTableByIdIfExists(paymentTableId);

        const linkField = paymentTable.getFieldByIdIfExists(linkFieldId);
        const memberTableId = linkField.options.linkedTableId;

        props.globalConfig.setAsync(GlobalConfigKeys.MEMBER_TABLE_ID, memberTableId);
   };

    return(
        <div>
            <Heading margin={2}>
                Payment Settings
            </Heading>
            <Box marginX={2}>
                <FormField label="Which table holds the payments?">
                    <TablePickerSynced
                        globalConfigKey={GlobalConfigKeys.PAYMENT_TABLE_ID}
                        onChange={() => resetPaymentTableRelatedKeys()}
                        size="large"
                        maxWidth="350px"
                    />
                </FormField>
                {props.paymentTable &&
                    <div>
                        <Heading size="xsmall" variant="caps">{props.paymentTable.name} Fields:</Heading>
                        <Box display="flex" flexDirection="row">
                            <FormField label="Member link:" marginRight={1}>
                                <FieldPickerSynced
                                    size="small"
                                    table={props.paymentTable}
                                    globalConfigKey={GlobalConfigKeys.PAYMENT_MEMBER_LINK_FIELD_ID}
                                    allowedTypes={[
                                        FieldType.MULTIPLE_RECORD_LINKS
                                    ]}
									onChange={() => getLinkedMemberTable()}
                                />
                            </FormField>
							
                            <FormField label="Date:" marginRight={1}>
                                <FieldPickerSynced
                                    size="small"
                                    table={props.paymentTable}
                                    globalConfigKey={GlobalConfigKeys.PAYMENT_DATE_FIELD_ID}
                                    allowedTypes={[
                                        FieldType.DATE_TIME,
										FieldType.DATE,
										FieldType.CREATED_TIME
                                    ]}
                                />
                            </FormField>
						</Box>
                    </div>
                }
				{props.memberTable &&
                    <div>
                        <Heading size="xsmall" variant="caps">{props.memberTable.name} Fields:</Heading>
                        <Box display="flex" flexDirection="row">
                            <FormField label="Full name:" marginRight={1}>
                                <FieldPickerSynced
                                    size="small"
                                    table={props.memberTable}
                                    globalConfigKey={GlobalConfigKeys.MEMBER_NAME_FIELD_ID}
                                    allowedTypes={[
                                        FieldType.SINGLE_LINE_TEXT,
										FieldType.FORMULA
                                    ]}
                                />
                            </FormField>
							<FormField label="Address:" marginRight={1}>
                                <FieldPickerSynced
                                    size="small"
                                    table={props.memberTable}
                                    globalConfigKey={GlobalConfigKeys.MEMBER_ADDRESS_FIELD_ID}
                                    allowedTypes={[
                                        FieldType.MULTILINE_TEXT
                                    ]}
                                />
                            </FormField>
                            <FormField label="Postcode:" marginRight={1}>
                                <FieldPickerSynced
                                    size="small"
                                    table={props.memberTable}
                                    globalConfigKey={GlobalConfigKeys.MEMBER_POSTCODE_FIELD_ID}
                                    allowedTypes={[
                                        FieldType.SINGLE_LINE_TEXT
                                    ]}
                                />
                            </FormField>

                        </Box>
 
                    </div>
                }


                <Box display="flex" marginBottom={2}>
					<Button
						variant="primary"
						icon="check"
						marginLeft={2}
						disabled={!props.initialSetupDone}
						onClick={props.onDoneClick}
						alignSelf="right"
					>
						Done
					</Button>
				</Box>
			</Box>
		</div>
    );
}

initializeBlock(() => <Payment />);
