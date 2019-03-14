$(document).ready(() => {
    $.ajax({
        method: "GET",
        url: "/api/manager",
        // eslint-disable-next-line prettier/prettier
        success: (response) => {
            console.log(JSON.stringify(response));
        },
        // eslint-disable-next-line prettier/prettier
        error: (response) => {
            console.log(JSON.stringify(response));
        }
    });
});
