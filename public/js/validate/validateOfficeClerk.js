const validateOfficeClerk = function(dataObject) {
    const productData = dataObject.products;
    const soData = dataObject.so;
    const poData = dataObject.po;
    let validated = {
        valid: false,
        message: "Please fill out entire form."
    };

    if (![1, 2, 3, 4, 5].includes(productData.warehouse)) {
        validated.message = "Please select a warehouse.";
        // eslint-disable-next-line prettier/prettier
    } else if (!["H40", "J55", "K55", "N80-1", "L80"].includes(soData.material)) {
        validated.message = "Please select a material grade.";
    } else if (!poData.purchaseOrder) {
        validated.message = "Please enter a purchase order number.";
    } else if (!productData.description) {
        validated.message = "Please enter a product description.";
    } else if (!soData.salesOrder) {
        validated.message = "Please enter a sales order number.";
    } else if (!soData.description) {
        validated.message = "Please enter a sales order description.";
    } else if (!poData.customer) {
        validated.message = "Please enter a customer.";
    } else if (!poData.contact) {
        validated.message = "Please enter a contact.";
    } else {
        validated.valid = true;
        validated.message = "Success!";
    }
    return validated;
};

export default validateOfficeClerk;
