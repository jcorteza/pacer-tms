module.exports = function(sequelize, DataTypes) {
    const SO = sequelize.define("SO", {
        salesOrder: {
            type: DataTypes.STRING,
            allowNull: false,
            primaryKey: true
        },
        description: {
            type: DataTypes.STRING,
            allowNull: false
        },
        material: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "H40",
            validate: {
                isIn: [["H40", "J55", "K55", "N80-1", "L80"]]
            }
        },
        orderQty: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1,
                isInt: true
            }
        }
    });
    SO.associate = function(models) {
        SO.PO = SO.belongsTo(models.PO, {
            foreignKey: "purchaseOrder"
        });
    };
    return SO;
};
