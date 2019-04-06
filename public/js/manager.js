$(document).ready(() => {
    $.ajax({
        method: "GET",
        url: "/api/manager",
        // eslint-disable-next-line prettier/prettier
        complete: (response) => {
            const data = response.responseText;
            if (data.hasOwnProperty("products")) {
                console.log("data has products property");
                $("#inventoryTable").empty();
                console.log(JSON.stringify(data.products));
                for (const product in data.products) {
                    console.log(JSON.stringify(product));
                    const productID = $("td").text(product.id);
                    const productRange = $("td").text(product.range);
                    const productFinish = $("td").text(product.finish);
                    const productLocation = $("td").text(product.location);
                    const productWarehouse = $("td").text(product.warehouse);
                    const productDesc = $("td").text(product.description);
                    const productStatus = $("td").text(product.status);
                    const productSO = $("td").text(product.salesOrder);
                    const row = $("tr")
                        .append(productID)
                        .append(productRange)
                        .append(productFinish)
                        .append(productLocation)
                        .append(productWarehouse)
                        .append(productDesc)
                        .append(productStatus)
                        .append(productSO);
                    $("#inventoryTable").append(row);
                }
            }
            if (data.hasOwnProperty("purchaseOrders")) {
                console.log("data has purchaseOrders property");
                $("#poTable").empty();
                data.purchaseOrders.each((po) => {
                    const poID = $("td").text(po.purchaseOrder);
                    const poCustomer = $("td").text(po.customer);
                    const poContact = $("td").text(po.contact);
                    const row = $("tr")
                        .append(poID)
                        .append(poCustomer)
                        .append(poContact);
                    $("#poTable").append(row);
                });
            }
        }
    });
});
