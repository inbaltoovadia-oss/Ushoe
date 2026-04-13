import { useState, useEffect } from "react";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCart, subscribeCart, removeFromCart, updateQty } from "../lib/cartStore";

export default function CartDrawer({ open, onClose }) {
  const [items, setItems] = useState(getCart());

  useEffect(() => {
    return subscribeCart(setItems);
  }, []);

  const total = items.reduce((sum, i) => sum + i.shoe.price * i.qty, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <h2 className="font-heading font-bold text-xl">Your Cart</h2>
                <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {items.reduce((s, i) => s + i.qty, 0)}
                </span>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingBag className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-muted-foreground">Your cart is empty</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={`${item.shoe.id}-${item.size}`} className="flex gap-4 bg-secondary/30 rounded-2xl p-4">
                    <img
                      src={item.shoe.image_url}
                      alt={item.shoe.name}
                      className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{item.shoe.brand}</p>
                      <p className="font-heading font-semibold text-sm line-clamp-1">{item.shoe.name}</p>
                      {item.size && <p className="text-xs text-muted-foreground mt-0.5">Size: {item.size}</p>}
                      <p className="font-heading font-bold text-base mt-1">${item.shoe.price * item.qty}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-2 bg-background rounded-lg">
                          <button
                            onClick={() => updateQty(item.shoe.id, item.size, item.qty - 1)}
                            className="p-1.5 hover:text-primary transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                          <button
                            onClick={() => updateQty(item.shoe.id, item.size, item.qty + 1)}
                            className="p-1.5 hover:text-primary transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.shoe.id, item.size)}
                          className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-6 border-t border-border space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-muted-foreground">Total</span>
                  <span className="font-heading font-bold text-2xl">${total}</span>
                </div>
                <button className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-semibold text-lg hover:opacity-90 transition-opacity">
                  Checkout
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}