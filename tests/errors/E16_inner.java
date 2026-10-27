public class Main {
    class Item { String n; Item(String n) { this.n = n; } }
    public static void main(String[] args) {
        Item it = new Item("x");
        System.out.println(it.n);
    }
}
