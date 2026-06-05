const Post = sequelize.define('Post', {
  // ... existing fields ...
  isDraft: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  // ... existing config ...
});