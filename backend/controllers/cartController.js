// controllers/cartController.js
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
exports.getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user.id })
    .populate({
      path: 'items.product',
      select: 'name price salePrice images slug status variants'
    })
    .populate({
      path: 'savedItems.product',
      select: 'name price salePrice images slug status'
    });

  if (!cart) {
    cart = await Cart.create({ user: req.user.id, items: [] });
  }

  res.status(200).json({
    success: true,
    cart
  });
});

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
exports.addToCart = asyncHandler(async (req, res) => {
  const { productId, size, color, quantity = 1 } = req.body;

  // Validate product exists and is active
  const product = await Product.findById(productId);
  if (!product || product.status !== 'active') {
    return res.status(404).json({
      success: false,
      message: 'Product not found or unavailable'
    });
  }

  // Check if variant exists and has stock
  const variant = product.variants.find(
    v => v.size === size && v.color.name === color
  );

  if (!variant) {
    return res.status(400).json({
      success: false,
      message: 'Product variant not found'
    });
  }

  if (variant.stock < quantity) {
    return res.status(400).json({
      success: false,
      message: `Only ${variant.stock} items available in stock`
    });
  }

  // Get or create cart
  let cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    cart = await Cart.create({ user: req.user.id, items: [] });
  }

  // Check if item already exists in cart
  const existingItemIndex = cart.items.findIndex(
    item => 
      item.product.toString() === productId &&
      item.variant.size === size &&
      item.variant.color.name === color
  );

  const currentPrice = product.salePrice || product.price;

  if (existingItemIndex > -1) {
    // Update quantity if item exists
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;
    
    if (newQuantity > variant.stock) {
      return res.status(400).json({
        success: false,
        message: `Cannot add more items. Only ${variant.stock} available in stock`
      });
    }

    cart.items[existingItemIndex].quantity = newQuantity;
    cart.items[existingItemIndex].priceAtAdd = currentPrice;
  } else {
    // Add new item
    cart.items.push({
      product: productId,
      variant: {
        size,
        color: {
          name: color,
          hexCode: variant.color.hexCode
        }
      },
      quantity,
      priceAtAdd: currentPrice
    });
  }

  await cart.save();

  // Populate and return updated cart
  cart = await Cart.findById(cart._id)
    .populate({
      path: 'items.product',
      select: 'name price salePrice images slug status variants'
    });

  res.status(200).json({
    success: true,
    message: 'Item added to cart',
    cart
  });
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/update
// @access  Private
exports.updateCartItem = asyncHandler(async (req, res) => {
  const { productId, size, color, quantity } = req.body;

  if (quantity < 1) {
    return res.status(400).json({
      success: false,
      message: 'Quantity must be at least 1'
    });
  }

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return res.status(404).json({
      success: false,
      message: 'Cart not found'
    });
  }

  // Find the item in cart
  const itemIndex = cart.items.findIndex(
    item => 
      item.product.toString() === productId &&
      item.variant.size === size &&
      item.variant.color.name === color
  );

  if (itemIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Item not found in cart'
    });
  }

  // Validate stock
  const product = await Product.findById(productId);
  const variant = product.variants.find(
    v => v.size === size && v.color.name === color
  );

  if (quantity > variant.stock) {
    return res.status(400).json({
      success: false,
      message: `Only ${variant.stock} items available in stock`
    });
  }

  // Update quantity
  cart.items[itemIndex].quantity = quantity;
  await cart.save();

  // Populate and return updated cart
  const updatedCart = await Cart.findById(cart._id)
    .populate({
      path: 'items.product',
      select: 'name price salePrice images slug status variants'
    });

  res.status(200).json({
    success: true,
    message: 'Cart item updated',
    cart: updatedCart
  });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove
// @access  Private
exports.removeFromCart = asyncHandler(async (req, res) => {
  const { productId, size, color } = req.body;

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return res.status(404).json({
      success: false,
      message: 'Cart not found'
    });
  }

  // Remove the item
  cart.items = cart.items.filter(
    item => !(
      item.product.toString() === productId &&
      item.variant.size === size &&
      item.variant.color.name === color
    )
  );

  await cart.save();

  // Populate and return updated cart
  const updatedCart = await Cart.findById(cart._id)
    .populate({
      path: 'items.product',
      select: 'name price salePrice images slug status variants'
    });

  res.status(200).json({
    success: true,
    message: 'Item removed from cart',
    cart: updatedCart
  });
});

// @desc    Clear entire cart
// @route   DELETE /api/cart/clear
// @access  Private
exports.clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return res.status(404).json({
      success: false,
      message: 'Cart not found'
    });
  }

  cart.items = [];
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Cart cleared',
    cart
  });
});

// @desc    Save item for later
// @route   POST /api/cart/save-for-later
// @access  Private
exports.saveForLater = asyncHandler(async (req, res) => {
  const { productId, size, color } = req.body;

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return res.status(404).json({
      success: false,
      message: 'Cart not found'
    });
  }

  // Find item in cart
  const itemIndex = cart.items.findIndex(
    item => 
      item.product.toString() === productId &&
      item.variant.size === size &&
      item.variant.color.name === color
  );

  if (itemIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Item not found in cart'
    });
  }

  // Move item to saved items
  const item = cart.items[itemIndex];
  cart.savedItems.push({
    product: item.product,
    variant: item.variant
  });

  // Remove from cart items
  cart.items.splice(itemIndex, 1);
  await cart.save();

  // Populate and return updated cart
  const updatedCart = await Cart.findById(cart._id)
    .populate({
      path: 'items.product',
      select: 'name price salePrice images slug status variants'
    })
    .populate({
      path: 'savedItems.product',
      select: 'name price salePrice images slug status'
    });

  res.status(200).json({
    success: true,
    message: 'Item saved for later',
    cart: updatedCart
  });
});

// @desc    Move item back to cart from saved items
// @route   POST /api/cart/move-to-cart
// @access  Private
exports.moveToCart = asyncHandler(async (req, res) => {
  const { productId, size, color } = req.body;

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) {
    return res.status(404).json({
      success: false,
      message: 'Cart not found'
    });
  }

  // Find item in saved items
  const savedItemIndex = cart.savedItems.findIndex(
    item => 
      item.product.toString() === productId &&
      item.variant.size === size &&
      item.variant.color.name === color
  );

  if (savedItemIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Item not found in saved items'
    });
  }

  // Validate product and stock
  const product = await Product.findById(productId);
  if (!product || product.status !== 'active') {
    return res.status(404).json({
      success: false,
      message: 'Product not available'
    });
  }

  const variant = product.variants.find(
    v => v.size === size && v.color.name === color
  );

  if (!variant || variant.stock < 1) {
    return res.status(400).json({
      success: false,
      message: 'Product variant out of stock'
    });
  }

  // Move item back to cart
  const savedItem = cart.savedItems[savedItemIndex];
  cart.items.push({
    product: savedItem.product,
    variant: savedItem.variant,
    quantity: 1,
    priceAtAdd: product.salePrice || product.price
  });

  // Remove from saved items
  cart.savedItems.splice(savedItemIndex, 1);
  await cart.save();

  // Populate and return updated cart
  const updatedCart = await Cart.findById(cart._id)
    .populate({
      path: 'items.product',
      select: 'name price salePrice images slug status variants'
    })
    .populate({
      path: 'savedItems.product',
      select: 'name price salePrice images slug status'
    });

  res.status(200).json({
    success: true,
    message: 'Item moved to cart',
    cart: updatedCart
  });
});