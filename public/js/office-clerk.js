$(document).ready(function() {
    // Getting references to our form and input
    //const batches = require("../public/batches.json");
    const officeClerkForm = $("form.office");
    let warehouse = $("#warehouse");
    let material = $("#materialGrade");
    let descriptionSO = $("#description-so");
    let descriptionProduct = $("#description-product");
    let purchaseOrder = $("#purchaseOrder");
    let salesOrder = $("#salesOrder");
    let customerName = $("#customerName");
    let contact = $("#contact");

    // Does a post to the signup route. If successful, we are redirected to the members page
    // Otherwise we log any errors
    //Display
    $.ajax({
        method: "GET",
        url: "/api/batches",
        success: function(data) {
            // let batches = JSON.parse(data);
            for (const key in data) {
                const batch = data[key];
                let rangeInfo = $("<td>").text(batch.products.range);
                let finishInfo = $("<td>").text(batch.products.finish);
                let locationInfo = $("<td>").text(batch.products.location);
                let qtyInfo = $("<td>").text(batch.so.orderQty);
                let statusInfo = $("<td>").text(batch.products.status);
                let tableRow = $("<tr>")
                    .attr("id", key)
                    .attr("data-finish", batch.products.finish)
                    .attr("data-range", batch.products.range)
                    .attr("data-qty", batch.so.orderQty)
                    .attr("data-location", batch.products.location)
                    .attr("data-status", batch.products.status)
                    .append(
                        finishInfo,
                        rangeInfo,
                        qtyInfo,
                        locationInfo,
                        statusInfo
                    );
                $("tbody").append(tableRow);
            }
        },
        error: function(response) {
            console.log(JSON.stringify(response));
        }
    });

    $("table").on("click", "tr", function() {
        $("tr").removeAttr("class");
        let finish = $(this).attr("data-finish");
        let range = $(this).attr("data-range");
        let qty = $(this).attr("data-qty");
        let location = $(this).attr("data-location");
        // eslint-disable-next-line prettier/prettier
        let status = $(this).attr("data-status").toUpperCase();
        const key = $(this).attr("id");
        $(this).attr("class", "bg-light");

        officeClerkForm.on("submit", function(event) {
            event.preventDefault();
            let dbData = {
                key: key,
                info: {
                    products: {
                        range: range,
                        finish: finish,
                        location: location,
                        warehouse: warehouse.val(),
                        description: descriptionProduct.val().trim(),
                        status: status
                    },
                    so: {
                        salesOrder: salesOrder.val().trim(),
                        description: descriptionSO.val().trim(),
                        material: material.val(),
                        orderQty: qty
                    },
                    po: {
                        purchaseOrder: purchaseOrder.val().trim(),
                        contact: contact.val().trim(),
                        customer: customerName.val().trim()
                    }
                }
            };
            console.log(dbData);
            if (
                !dbData.info.products.warehouse ||
                !dbData.info.products.description ||
                !dbData.info.so.salesOrder ||
                !dbData.info.so.description ||
                !dbData.info.so.material ||
                !dbData.info.po.purchaseOrder ||
                !dbData.info.po.contact ||
                !dbData.info.po.customer
            ) {
                console.log("you forgot to fill out one of the fields");
                return;
            }
            // If we have an email and password, run the signUpUser function
            const dataAdded = addToDB(dbData);
            if (dataAdded) {
                $(`#${key}`).remove();
            }
            // groundOpsForm.val("");
            // finish.val("");
            // pipeRange.val("");
            // batchQty.val("");
            // location.val("");
        });

        function addToDB(data) {
            console.log("Inside addToDB function");
            $.ajax({
                method: "POST",
                url: "/api/newData",
                data: data,
                dataType: "json",
                success: function(response) {
                    console.log(response.message);
                    return true;
                },
                error: function(response) {
                    console.log(JSON.stringify(response));
                    return false;
                }
            });
        }
    });
});
