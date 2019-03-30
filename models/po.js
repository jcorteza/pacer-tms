module.exports = function(sequelize, DataTypes) {
    const PO = sequelize.define("PO", {
        purchaseOrder: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true
        },
        contact: {
            type: DataTypes.STRING,
            allowNull: true,
            isAlpha: true
        },
        customer: {
            type: DataTypes.STRING,
            allowNull: false
        }
    });
    return PO;
};
