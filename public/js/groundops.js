import validateGroundops from "./validate/validateGroundops.js";

$(document).ready(function() {
    // Getting references to our form and input
    const groundOpsForm = $("form.groundops");
    let material = $("select#material");
    let finishKind = $("select#finish");
    let pipeRange = $("select#range");
    let batchQty = $("input#quantity");
    let location = $("select#location");
    let status = $("#status");

    groundOpsForm.on("submit", function(event) {
        event.preventDefault();
        $("#addError").attr("class", "d-none");
        $("#addBtn")
            .text("Working...")
            .attr("disabled", true);
        let forkliftData = {
            products: {
                range: pipeRange.val().toUpperCase(),
                finish: finishKind.val().toUpperCase(),
                location: location.val().toUpperCase(),
                warehouse: "",
                description: "",
                status: status.val().toUpperCase()
            },
            so: {
                salesOrder: "",
                desription: "",
                material: material.val(),
                orderQty: batchQty.val()
            },
            po: {
                purchaseOrder: "",
                contact: "",
                customer: ""
            }
        };
        let validate = validateGroundops(forkliftData);
        if (validate.valid) {
            sendData(forkliftData);
        } else {
            $("#addBtn")
                .text("Add")
                .attr("disabled", false);
            $("#addError")
                .attr("class", "alert alert-danger text-center d-block")
                .text(validate.message);
        }
    });

    // Does a post to the signup route. If successful, we are redirected to the members page
    // Otherwise we log any errors
    function sendData(data) {
        $.ajax({
            method: "PUT",
            url: "/api/batches",
            data: data,
            dataType: "json",
            success: function() {
                $("#addBtn").text("Success!");
                setTimeout(function() {
                    material.prop("selectedIndex", 0);
                    finishKind.prop("selectedIndex", 0);
                    pipeRange.prop("selectedIndex", 0);
                    batchQty.val("");
                    location.prop("selectedIndex", 0);
                    status.prop("selectedIndex", 0);
                    $("#addBtn")
                        .text("Add")
                        .attr("disabled", false);
                }, 1000);
            },
            error: function(err) {
                console.log(
                    `There was an error with the ajax POST: ${JSON.stringify(
                        err.error
                    )}`
                );
                $("#addError")
                    .attr("class", "alert alert-danger text-center d-block")
                    .text("Something went wrong. Please try again.");
            }
        });
    }
});
