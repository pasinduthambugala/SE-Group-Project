// Sri Lanka NIC: old 9 digits + [V|X] (total 10) or new 12 digits
const nicRegex = /^(?:\d{9}[VXvx]|\d{12})$/;

// Simple phone validator: 10 digits starting with 0, or +94 then 9 digits
const phoneRegex = /^(?:0\d{9}|\+94\d{9})$/;

function normalizePhone(phone) {
  // convert 0xxxxxxxxx -> +94xxxxxxxxx
  if (/^0\d{9}$/.test(phone)) {
    return '+94' + phone.slice(1);
  }
  return phone;
}

module.exports = { nicRegex, phoneRegex, normalizePhone };
