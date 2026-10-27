import java.util.ArrayList;
import java.util.Scanner;

class Product {
    private String id;
    private String name;
    private String category;
    private int price;
    private int stock;

    public Product(String id, String name, String category, int price, int stock) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.price = price;
        this.stock = stock;
    }

    // TODO: getters (and setters for price & stock)
}

public class Main {
    static Scanner sc = new Scanner(System.in);
    static ArrayList<Product> products = new ArrayList<>();
    static int counter = 1;

    public static void main(String[] args) {
        // TODO: menu 1-5 with Insert, View, Update, Delete, Exit
    }
}
