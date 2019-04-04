const validateGroundops = function(forkliftDataObject) {
    const soData = forkliftDataObject.so;
    const productData = forkliftDataObject.products;
    let validated = {
        valid: false,
        message: "Please fill out entire form."
    };

    if (!["H40", "J55", "K55", "N80-1", "L80"].includes(soData.material)) {
        validated.message = "Please select a material.";
        // eslint-disable-next-line prettier/prettier
    } else if (!["P-B", "P-P", "B-B", "PE-PE", "P", "B"].includes(productData.finish)) {
        validated.message = "Please select a finish.";
    } else if (!["RANGE-2", "RANGE-3"].includes(productData.range)) {
        validated.message = "Please select a range.";
    } else if (!soData.orderQty) {
        validated.message = "Please enter a quantity.";
    } else if (
        !["A1", "A2", "A3", "A4", "A5", "A6", "TRANSIT"].includes(
            productData.location
        )
    ) {
        validated.message = "Please select a location.";
    } else if (
        !["DAMAGED", "GOOD", "QC-INSPECT"].includes(productData.status)
    ) {
        validated.message = "Please select a status.";
    } else {
        validated.valid = true;
        validated.message = "Success!";
    }
    return validated;
};

export default validateGroundops;
