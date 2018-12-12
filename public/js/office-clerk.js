$(document).ready(function() {
    // Getting references to our form and input
   //const batches = require("../public/batches.json");
   const officeClerkForm = $("form.office");
   let warehouse = $("#warehouse");
   let material = $("#materialGrade");
   let description = $("#description");
   let productDescription = $("#discription-po")
   let purchaseOrder = $("#purchaseOrder");
   let salesOrder = $("#salesOrder");
   let customerName = $("#customerName");
   let contact = $("#contact"); 

    // Does a post to the signup route. If successful, we are redirected to the members page
    // Otherwise we log any errors
    //Display
    $.ajax({
        method: "GET",
        url: "/api/batches"
    })
        .then(function(data) {
            console.log("inside .then function");
            let batches = JSON.parse(data);
            batches.forEach(function(batch) {
                console.log(batch);
                console.log(batch.products);
                let rangeInfo = $("<td>").text(batch.products.range);
                let finishInfo = $("<td>").text(batch.products.finish);
                let locationInfo = $("<td>").text(batch.products.location);
                let qtyInfo = $("<td>").text(batch.so.orderQty);
                let statusInfo = $("<td>").text("batch.products.status");
                let tableRow = $("<tr>")
                    .attr("data-finish", finishInfo)
                    .attr("data-range", rangeInfo)
                    .attr("data-qty", qtyInfo)
                    .attr("data-location", locationInfo)
                    .attr("data-status", statusInfo)
                    .append(finishInfo, rangeInfo, qtyInfo, locationInfo, statusInfo);
                $("tbody").append(tableRow);
            });
        })
       .catch(function(err) {
            console.log(JSON.stringify(err));    
        });

        $("tr").on("click", function(this){
            let finish = $(this).attr("data-finish");
            let range = $(this).attr("data-range");
            let qty = $(this).attr("data-qty");
            let location = $(this).attr("data-location");
            let status = $(this).attr("data-status");

            officeClerkForm.on("submit", function(event) {
                event.preventDefault();
                let dbData = {
                    products: {
                        range: range,
                        finish: finish,
                        location: location,
                        warehouse: warehouse.val(),
                        description: productDescription.val().trim(),
                        status: status
                    },
                    so: {
                        salesOrder: salesOrder.val().trim(),
                        desription: description.val().trim(),
                        material: material.val(),
                        orderQty: qty
                    },
                    po: {
                        purchaseOrder: purchaseOrder.val().trim(),
                        contact: contact.val().trim(),
                        customer: customerName.val().trim()
                    }
                };
    
                if (
                    !dbData.products.warehouse ||
                    !dbData.products.description ||
                    !dbData.so.salesOrder ||
                    !dbData.so.desription ||
                    !dbData.so.material ||
                    !dbData.po.purchaseOrder ||
                    !dbData.po.contact ||
                    !dbData.po.customer
                ) {
                    console.log("you forgot to fill out one of the fields");
                    return;
                }
                // If we have an email and password, run the signUpUser function
                addToDB(forkliftData);
                groundOpsForm.val("");
                finishKind.val("");
                pipeRange.val("");
                batchQty.val("");
                location.val("");
            });
            function addToDB(data) {
                $.ajax({
                    method: "POST",
                    url : "/api",
                    data : data,
                    dataType : "json",
                    success : function() {},
                    error : function (error) {console.log(JSON.stringify(error))}
                });
                }
        });

});

