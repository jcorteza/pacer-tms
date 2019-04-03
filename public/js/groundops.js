import "../js/validate/validateGroundops";
import validateGroundops from "../js/validate/validateGroundops";

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
        let forkliftData = {
            products: {
                range: pipeRange.val().toUpperCase(),
                finish: finishKind.val().toUpperCase(),
                location: location.val().toUpperCase(),
                warehouse: "",
                description: "",
                status: status.val()
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
        console.log(JSON.stringify(validate));
        if (validate.valid) {
            sendData(forkliftData);
        } else {
            $("#addError")
                .attr("class", "alert alert-danger text-center")
                .text(validate.message)
                .atrr("class", "d-block");
        }
    });

    // Does a post to the signup route. If successful, we are redirected to the members page
    // Otherwise we log any errors
    function sendData(data) {
        console.log("inside sendData function");
        console.log(data);
        $.ajax({
            method: "PUT",
            url: "/api/batches",
            data: data,
            dataType: "json",
            success: function() {
                $("#addBtn")
                    .text("Success!")
                    .attr("disabled", true);
                setTimeout(function() {
                    material.prop("selected", 0);
                    finishKind.prop("selected", 0);
                    pipeRange.prop("selected", 0);
                    batchQty.val("");
                    location.prop("selected", 0);
                    status.prop("selected", 0);
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
                    .attr("class", "alert alert-danger text-center")
                    .text("Something went wrong. Please try again.")
                    .atrr("class", "d-block");
            }
        });
    }
});
