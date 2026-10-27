import java.util.ArrayList;
import java.util.Scanner;

// TODO: class OutOfStockException extends Exception

class Product {
    private String name;
    private int stock;

    public Product(String name, int stock) {
        this.name = name;
        this.stock = stock;
    }

    public String getName() { return name; }
    public int getStock() { return stock; }

    // TODO: public void buy(int qty) throws OutOfStockException
}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        ArrayList<Product> products = new ArrayList<>();

        // TODO
    }
}
